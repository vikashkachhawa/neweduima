/**
 * Interactive Code Execution Service
 *
 * Unlike the batch executeCode(), this service keeps the child process stdin
 * open so the user can type input on demand via WebSocket.
 *
 * Flow:
 *  1. Client emits code:run  → startSession() spawns child, streams stdout/stderr
 *  2. Client emits code:input → sendInput() writes a line to child stdin
 *  3. Child exits            → onDone callback, session cleaned up
 *  4. Client disconnects     → killSession() terminates child
 *
 * Security:
 *  - Same dangerous-pattern filter as codeExecutionService
 *  - Same env sanitization (Windows-aware)
 *  - GLOBAL_TIMEOUT_MS hard cap
 *  - MAX_OUTPUT_BYTES output cap
 *  - Temp dir cleaned after each session
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

// ── Platform detection ──────────────────────────────────────────────────────
const IS_WINDOWS = process.platform === 'win32';
const PYTHON_CMD = IS_WINDOWS ? 'py' : 'python3';
const EXE_EXT    = IS_WINDOWS ? '.exe' : '';

// ── Limits ──────────────────────────────────────────────────────────────────
const GLOBAL_TIMEOUT_MS = 10_000;
const MAX_OUTPUT_BYTES  = 50_000;
const MAX_CODE_LENGTH   = 65_536;

// ── Windows-aware spawn environment ─────────────────────────────────────────
const getSpawnEnv = () =>
  IS_WINDOWS
    ? {
        PATH:        process.env.PATH        || '',
        PATHEXT:     process.env.PATHEXT     || '.COM;.EXE;.BAT;.CMD;.PY',
        SystemRoot:  process.env.SystemRoot  || 'C:\\Windows',
        SystemDrive: process.env.SystemDrive || 'C:',
        TEMP:        process.env.TEMP        || os.tmpdir(),
        TMP:         process.env.TMP         || os.tmpdir(),
        USERPROFILE: process.env.USERPROFILE || '',
      }
    : { PATH: process.env.PATH || '' };

// ── Dangerous pattern detection ─────────────────────────────────────────────
const DANGEROUS_PATTERNS = {
  python: [
    /\bos\s*\.\s*system\b/,
    /\bsubprocess\b/,
    /\beval\s*\(/,
    /\bexec\s*\(/,
    /\b__import__\s*\(/,
    /\bopen\s*\(.*['"]\s*w/,
    /\bsocket\b/,
    /\burllib\b/,
    /\brequests\b/,
    /\bshutil\b/,
    /\bpickle\b/,
    /\bctypes\b/,
  ],
  javascript: [
    /\brequire\s*\(\s*['"]child_process/,
    /\brequire\s*\(\s*['"]fs['"].*write/,
    /\brequire\s*\(\s*['"]net['"]\s*\)/,
    /\brequire\s*\(\s*['"]http['"]\s*\)/,
    /\bprocess\.exit\b/,
    /\bprocess\.env\b/,
    /\beval\s*\(/,
    /\bnew\s+Function\s*\(/,
    /\bglobal\./,
  ],
  java: [
    /Runtime\s*\.\s*getRuntime\s*\(\s*\)\s*\.\s*exec/,
    /ProcessBuilder/,
    /new\s+File\s*\(/,
    /FileWriter/,
    /FileOutputStream/,
    /System\s*\.\s*exit/,
    /Class\s*\.\s*forName/,
    /java\.net\./,
    /java\.lang\.reflect\./,
  ],
  c: [
    /\bsystem\s*\(/,
    /\bpopen\s*\(/,
    /\bfork\s*\(/,
    /\bexecv\s*\(/,
    /\bexecve\s*\(/,
    /\bsocket\s*\(/,
  ],
  cpp: [
    /\bsystem\s*\(/,
    /\bpopen\s*\(/,
    /\bfork\s*\(/,
    /\bexecv\s*\(/,
    /\bexecve\s*\(/,
    /\bsocket\s*\(/,
    /\b#include\s*<.*network.*>/,
  ],
};

const sanitizeCode = (code, language) => {
  const patterns = DANGEROUS_PATTERNS[language] || [];
  for (const pattern of patterns) {
    if (pattern.test(code)) {
      return { safe: false, reason: `Disallowed pattern: ${pattern.source.substring(0, 60)}` };
    }
  }
  return { safe: true };
};

// ── Compile helper (blocking, used for Java / C / C++) ───────────────────────
const compileProcess = (cmd, args, timeoutMs = 15_000) =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, {
      env: getSpawnEnv(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stdin.end();
    child.stdout.on('data', () => {}); // discard
    child.stderr.on('data', (d) => { stderr += d; });
    const t = setTimeout(() => {
      try { child.kill(); } catch {}
      resolve({ success: false, stderr: 'Compilation timed out' });
    }, timeoutMs);
    child.on('close', (code) => {
      clearTimeout(t);
      resolve({ success: code === 0, stderr });
    });
    child.on('error', (err) => {
      clearTimeout(t);
      resolve({ success: false, stderr: err.message });
    });
  });

// ── Active sessions store ────────────────────────────────────────────────────
// sessionId → { process, tempDir, startTime, timeoutTimer, outputBytes, killed }
const sessions = new Map();

// ── Temp dir cleanup ─────────────────────────────────────────────────────────
const cleanupDir = async (tempDir) => {
  try { await fs.rm(tempDir, { recursive: true, force: true }); }
  catch { /* best-effort */ }
};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Start an interactive execution session.
 *
 * @param {string}   sessionId  Unique ID (typically socket.id)
 * @param {string}   language   python | javascript | java | c | cpp
 * @param {string}   code       Source code
 * @param {{ onOutput, onDone, onError }} callbacks
 *   onOutput(type, text)  – streaming stdout/stderr/system chunks
 *   onDone({ exitCode, executionTimeMs, timedOut, limitExceeded, killed })
 *   onError(message)      – startup/compile errors (session never ran)
 */
export async function startSession(sessionId, language, code, { onOutput, onDone, onError }) {
  // Kill any prior session for this ID
  killSession(sessionId);

  const VALID_LANGS = ['python', 'javascript', 'java', 'c', 'cpp'];
  if (!VALID_LANGS.includes(language)) return onError(`Unsupported language: ${language}`);
  if (!code || code.length === 0)       return onError('Code is required');
  if (code.length > MAX_CODE_LENGTH)    return onError('Code exceeds maximum allowed size (64 KB)');

  const check = sanitizeCode(code, language);
  if (!check.safe) return onError(`Security violation: ${check.reason}`);

  // Create isolated temp directory
  const execId  = crypto.randomBytes(8).toString('hex');
  const tempDir = path.join(os.tmpdir(), `codearena_ia_${execId}`);
  try {
    await fs.mkdir(tempDir, { recursive: true });
  } catch (e) {
    return onError(`Setup failed: ${e.message}`);
  }

  // Resolve command + args (compile synchronously where needed)
  let cmd, args;
  try {
    if (language === 'python') {
      const file = path.join(tempDir, 'solution.py');
      await fs.writeFile(file, code, 'utf8');
      cmd  = PYTHON_CMD;
      args = ['-u', file]; // -u = unbuffered stdout — essential for real-time prompts

    } else if (language === 'javascript') {
      const file = path.join(tempDir, 'solution.js');
      await fs.writeFile(file, code, 'utf8');
      cmd  = 'node';
      args = ['--max-old-space-size=64', file];

    } else if (language === 'java') {
      const classMatch = code.match(/public\s+class\s+(\w+)/);
      const className  = classMatch ? classMatch[1] : 'Solution';
      const file       = path.join(tempDir, `${className}.java`);
      await fs.writeFile(file, code, 'utf8');
      onOutput('system', 'Compiling…\n');
      const comp = await compileProcess('javac', [file]);
      if (!comp.success) { await cleanupDir(tempDir); return onError(comp.stderr || 'Compilation failed'); }
      onOutput('system', 'Compiled successfully\n');
      cmd  = 'java';
      args = ['-cp', tempDir, '-Xmx64m', className];

    } else if (language === 'c') {
      const srcFile = path.join(tempDir, 'solution.c');
      const outFile = path.join(tempDir, `solution_out${EXE_EXT}`);
      await fs.writeFile(srcFile, code, 'utf8');
      onOutput('system', 'Compiling C…\n');
      const comp = await compileProcess('gcc', [srcFile, '-o', outFile, '-lm', '-O2']);
      if (!comp.success) { await cleanupDir(tempDir); return onError(comp.stderr || 'Compilation failed'); }
      onOutput('system', 'Compiled successfully\n');
      cmd  = outFile;
      args = [];

    } else { // cpp
      const srcFile = path.join(tempDir, 'solution.cpp');
      const outFile = path.join(tempDir, `solution_out${EXE_EXT}`);
      await fs.writeFile(srcFile, code, 'utf8');
      onOutput('system', 'Compiling C++…\n');
      const comp = await compileProcess('g++', [srcFile, '-o', outFile, '-std=c++17', '-O2']);
      if (!comp.success) { await cleanupDir(tempDir); return onError(comp.stderr || 'Compilation failed'); }
      onOutput('system', 'Compiled successfully\n');
      cmd  = outFile;
      args = [];
    }
  } catch (e) {
    await cleanupDir(tempDir);
    return onError(e.message);
  }

  // Spawn child — stdin stays OPEN for interactive input
  const startTime = Date.now();
  let outputBytes = 0;

  const child = spawn(cmd, args, {
    env:   getSpawnEnv(),
    stdio: ['pipe', 'pipe', 'pipe'],
    // shell: false (default) — no shell, explicit command only
  });

  // Swallow "write to closed pipe" errors safely
  child.stdin.on('error', () => {});

  const session = {
    process:      child,
    tempDir,
    startTime,
    timeoutTimer: null,
    killed:       false,
  };

  // Hard timeout
  session.timeoutTimer = setTimeout(() => {
    session.killed = true;
    try { child.kill(); } catch {}
  }, GLOBAL_TIMEOUT_MS);

  sessions.set(sessionId, session);

  // Stream stdout in real-time
  child.stdout.on('data', (chunk) => {
    outputBytes += chunk.length;
    if (outputBytes > MAX_OUTPUT_BYTES) {
      session.killed = true;
      try { child.kill(); } catch {}
      return;
    }
    // Normalize Windows line endings before emitting
    onOutput('stdout', chunk.toString().replace(/\r\n/g, '\n').replace(/\r/g, '\n'));
  });

  // Stream stderr in real-time
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // Filter out harmless Python launcher warnings (Windows-specific)
    if (text.includes('Failed to read unmanaged installs') || text.includes('NoneType')) {
      return; // Don't emit this noise to the client
    }
    // Emit all other stderr output (real errors, compiler messages, etc.)
    onOutput('stderr', text);
  });

  child.on('close', (exitCode) => {
    clearTimeout(session.timeoutTimer);
    sessions.delete(sessionId);
    cleanupDir(tempDir);

    const executionTimeMs  = Date.now() - startTime;
    const limitExceeded    = outputBytes > MAX_OUTPUT_BYTES;
    const timedOut         = session.killed && !limitExceeded;

    onDone({ exitCode, executionTimeMs, timedOut, limitExceeded, killed: session.killed });
  });

  child.on('error', (err) => {
    clearTimeout(session.timeoutTimer);
    sessions.delete(sessionId);
    cleanupDir(tempDir);
    onError(`Failed to start process: ${err.message}`);
  });
}

/**
 * Write one line of stdin to the running process.
 * A newline is appended automatically.
 */
export function sendInput(sessionId, line) {
  const session = sessions.get(sessionId);
  if (!session || session.killed) return;
  try {
    session.process.stdin.write(line + '\n');
  } catch {
    // Process may have already exited — ignore
  }
}

/**
 * Forcefully terminate a session.
 */
export function killSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.killed = true;
  clearTimeout(session.timeoutTimer);
  try { session.process.kill(); } catch {}
  // The 'close' event will remove the session from the map and clean up the dir
}

/**
 * Terminate all active sessions (call on graceful shutdown).
 */
export function killAllSessions() {
  for (const [id] of sessions) {
    killSession(id);
  }
}
