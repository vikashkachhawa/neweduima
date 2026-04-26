/**
 * Secure Code Execution Service
 *
 * Executes user-submitted code in an isolated child process with:
 *  - Strict execution timeouts
 *  - Memory limits (via Node/OS flags where supported)
 *  - Output size limits
 *  - Code sanitization to block dangerous system calls / imports
 *  - Per-execution temp directory cleaned up after use
 *  - No network access from spawned processes (OS-level; we additionally
 *    strip dangerous patterns before execution)
 *
 * Supported languages: python, javascript, java, c, cpp
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------
const IS_WINDOWS = process.platform === 'win32';

// On Windows use the 'py' launcher (avoids the Windows Store python stub).
// On Unix prefer 'python3' then fall back to 'python'.
const PYTHON_CMD = IS_WINDOWS ? 'py' : 'python3';

// Compiled executables need .exe on Windows
const EXE_EXT = IS_WINDOWS ? '.exe' : '';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const GLOBAL_TIMEOUT_MS = 10_000; // Hard cap across all languages
const MAX_OUTPUT_BYTES = 50_000; // ~50 KB output cap
const MAX_CODE_LENGTH = 65_536; // 64 KB code cap

// Per-language settings
const LANG_CONFIG = {
  python: {
    ext: '.py',
    compile: null,
    run: (file) => ['python', ['-u', file]],
    // -u = unbuffered stdout
  },
  javascript: {
    ext: '.js',
    compile: null,
    run: (file) => ['node', ['--max-old-space-size=64', file]],
  },
  java: {
    ext: '.java',
    compile: (dir, file, className) => ['javac', [file]],
    run: (dir, className) => ['java', ['-cp', dir, '-Xmx64m', className]],
  },
  c: {
    ext: '.c',
    compile: (dir, file, outFile) => ['gcc', [file, '-o', outFile, '-lm']],
    run: (outFile) => [outFile, []],
  },
  cpp: {
    ext: '.cpp',
    compile: (dir, file, outFile) => ['g++', [file, '-o', outFile, '-std=c++17']],
    run: (outFile) => [outFile, []],
  },
};

// ---------------------------------------------------------------------------
// Dangerous pattern detection – blocks code containing obvious attack vectors
// ---------------------------------------------------------------------------
const DANGEROUS_PATTERNS = {
  python: [
    /\bos\s*\.\s*system\b/,
    /\bsubprocess\b/,
    /\beval\s*\(/,
    /\bexec\s*\(/,
    /\b__import__\s*\(/,
    /\bopen\s*\(.*['"]\s*w/,        // file write attempts
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
      return {
        safe: false,
        reason: `Code contains a disallowed pattern: ${pattern.source.substring(0, 60)}`,
      };
    }
  }
  return { safe: true };
};

// ---------------------------------------------------------------------------
// Helper: spawn a process and capture its output with timeout
// ---------------------------------------------------------------------------
const runProcess = (cmd, args, { input = '', timeoutMs = GLOBAL_TIMEOUT_MS, env = {} } = {}) => {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let killed = false;
    let startTime = Date.now();

    const sanitizedEnv = IS_WINDOWS
      ? {
          // Windows executables need these to function correctly
          PATH:       process.env.PATH       || '',
          PATHEXT:    process.env.PATHEXT    || '.COM;.EXE;.BAT;.CMD;.PY',
          SystemRoot: process.env.SystemRoot || 'C:\\Windows',
          SystemDrive: process.env.SystemDrive || 'C:',
          TEMP:       process.env.TEMP       || os.tmpdir(),
          TMP:        process.env.TMP        || os.tmpdir(),
          USERPROFILE: process.env.USERPROFILE || '',
        }
      : {
          PATH: process.env.PATH || '',
        };

    const child = spawn(cmd, args, {
      env: { ...sanitizedEnv, ...env },
      // Do NOT use shell:true — args would be string-concatenated (security risk).
      // Instead we rely on PATH resolution of the specific executables (py, node, etc.)
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const timer = setTimeout(() => {
      killed = true;
      // SIGKILL is not valid on Windows; child.kill() calls TerminateProcess
      try { child.kill(); } catch { /* ignore */ }
    }, timeoutMs);

    child.stdin.on('error', () => {
      // stdin errors are expected when process exits early — ignore safely
    });

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();

    child.stdout.on('data', (chunk) => {
      if (stdout.length + chunk.length <= MAX_OUTPUT_BYTES) {
        stdout += chunk.toString();
      }
    });

    child.stderr.on('data', (chunk) => {
      if (stderr.length + chunk.length <= MAX_OUTPUT_BYTES) {
        stderr += chunk.toString();
      }
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      const executionTimeMs = Date.now() - startTime;

      if (killed) {
        resolve({ success: false, stdout, stderr: 'Execution timed out.', exitCode: null, executionTimeMs, timedOut: true });
        return;
      }

      resolve({
        success: code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code,
        executionTimeMs,
        timedOut: false,
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        success: false,
        stdout: '',
        stderr: `Failed to start process: ${err.message}`,
        exitCode: null,
        executionTimeMs: Date.now() - startTime,
        timedOut: false,
      });
    });
  });
};

// ---------------------------------------------------------------------------
// Core execution logic per language
// ---------------------------------------------------------------------------
const executeInTempDir = async (language, code, input, timeoutMs) => {
  const execId = crypto.randomBytes(8).toString('hex');
  const tempDir = path.join(os.tmpdir(), `codearena_${execId}`);

  try {
    await fs.mkdir(tempDir, { recursive: true });

    if (language === 'python') {
      const file = path.join(tempDir, `solution.py`);
      await fs.writeFile(file, code, 'utf8');
      return await runProcess(PYTHON_CMD, ['-u', file], { input, timeoutMs });

    } else if (language === 'javascript') {
      const file = path.join(tempDir, `solution.js`);
      await fs.writeFile(file, code, 'utf8');
      return await runProcess('node', ['--max-old-space-size=64', file], { input, timeoutMs });

    } else if (language === 'java') {
      // Extract public class name from code; fallback to "Solution"
      const classMatch = code.match(/public\s+class\s+(\w+)/);
      const className = classMatch ? classMatch[1] : 'Solution';
      const file = path.join(tempDir, `${className}.java`);
      await fs.writeFile(file, code, 'utf8');

      // Compile
      const compile = await runProcess('javac', [file], { timeoutMs: 15_000 });
      if (!compile.success) {
        return { success: false, stdout: '', stderr: compile.stderr, exitCode: compile.exitCode, executionTimeMs: compile.executionTimeMs, timedOut: false };
      }

      // Run
      return await runProcess('java', ['-cp', tempDir, '-Xmx64m', className], { input, timeoutMs });

    } else if (language === 'c') {
      const srcFile = path.join(tempDir, 'solution.c');
      const outFile = path.join(tempDir, `solution_out${EXE_EXT}`);
      await fs.writeFile(srcFile, code, 'utf8');

      const compile = await runProcess('gcc', [srcFile, '-o', outFile, '-lm', '-O2'], { timeoutMs: 15_000 });
      if (!compile.success) {
        return { success: false, stdout: '', stderr: compile.stderr, exitCode: compile.exitCode, executionTimeMs: compile.executionTimeMs, timedOut: false };
      }

      return await runProcess(outFile, [], { input, timeoutMs });

    } else if (language === 'cpp') {
      const srcFile = path.join(tempDir, 'solution.cpp');
      const outFile = path.join(tempDir, `solution_out${EXE_EXT}`);
      await fs.writeFile(srcFile, code, 'utf8');

      const compile = await runProcess('g++', [srcFile, '-o', outFile, '-std=c++17', '-O2'], { timeoutMs: 15_000 });
      if (!compile.success) {
        return { success: false, stdout: '', stderr: compile.stderr, exitCode: compile.exitCode, executionTimeMs: compile.executionTimeMs, timedOut: false };
      }

      return await runProcess(outFile, [], { input, timeoutMs });

    } else {
      return { success: false, stdout: '', stderr: `Unsupported language: ${language}`, executionTimeMs: 0, timedOut: false };
    }
  } finally {
    // Always clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
  }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute code with a given input and return stdout/stderr.
 * Used for the "Run" button (custom input, not test cases).
 */
export const executeCode = async ({ language, code, input = '', timeoutMs = 5000 }) => {
  // Validate inputs at system boundary
  if (!LANG_CONFIG[language]) {
    return { success: false, error: `Unsupported language: ${language}`, output: '', executionTimeMs: 0 };
  }

  if (typeof code !== 'string' || code.length === 0) {
    return { success: false, error: 'Code is required', output: '', executionTimeMs: 0 };
  }

  if (code.length > MAX_CODE_LENGTH) {
    return { success: false, error: 'Code exceeds maximum allowed size (64 KB)', output: '', executionTimeMs: 0 };
  }

  // Ensure input is a string and bounded
  const safeInput = String(input || '').substring(0, 10_000);

  const sanitization = sanitizeCode(code, language);
  if (!sanitization.safe) {
    return { success: false, error: `Security violation: ${sanitization.reason}`, output: '', executionTimeMs: 0 };
  }

  const result = await executeInTempDir(language, code, safeInput, Math.min(timeoutMs, GLOBAL_TIMEOUT_MS));

  if (result.timedOut) {
    return { success: false, error: 'Execution timed out. Check for infinite loops.', output: result.stdout, executionTimeMs: result.executionTimeMs };
  }

  if (!result.success) {
    return { success: false, error: result.stderr || 'Runtime error', output: result.stdout, executionTimeMs: result.executionTimeMs };
  }

  return { success: true, output: result.stdout, error: null, executionTimeMs: result.executionTimeMs };
};

/**
 * Run code against a set of test cases and return per-test results.
 * Used by the "Submit" action.
 */
export const evaluateAgainstTestCases = async ({ language, code, testCases, timeoutMs = 5000 }) => {
  if (!LANG_CONFIG[language]) {
    return { error: `Unsupported language: ${language}`, results: [] };
  }

  if (typeof code !== 'string' || code.length === 0) {
    return { error: 'Code is required', results: [] };
  }

  if (code.length > MAX_CODE_LENGTH) {
    return { error: 'Code exceeds maximum allowed size (64 KB)', results: [] };
  }

  const sanitization = sanitizeCode(code, language);
  if (!sanitization.safe) {
    return { error: `Security violation: ${sanitization.reason}`, results: [] };
  }

  const results = [];
  let totalTime = 0;

  for (const tc of testCases) {
    let safeInput = String(tc.input_data || '').substring(0, 10_000);
    
    // Ensure input ends with newline for languages that use input() functions
    if (safeInput && !safeInput.endsWith('\n')) {
      safeInput += '\n';
    }
    
    const effectiveTimeout = Math.min(tc.time_limit_ms || timeoutMs, GLOBAL_TIMEOUT_MS);
    
    console.log(`[CodeArena] Test case ${tc.id}: Input (${safeInput.length} chars):\n${JSON.stringify(safeInput.substring(0, 200))}`);

    let result = await executeInTempDir(language, code, safeInput, effectiveTimeout);

    // Teacher-friendly fallback for common beginner Python tasks:
    // if stdin is comma-separated (e.g. "10,20") and code expects multiple input() calls,
    // retry once with newline-separated input on EOF.
    const eofInPython =
      language === 'python' &&
      result.stderr &&
      /EOFError:\s*EOF when reading a line/i.test(result.stderr);
    const looksCommaSeparatedSingleLine = safeInput.includes(',') && !safeInput.includes('\n');

    if (eofInPython && looksCommaSeparatedSingleLine) {
      const retriedInput = safeInput
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .join('\n') + '\n';
      result = await executeInTempDir(language, code, retriedInput, effectiveTimeout);
    }

    const actualOutput = result.stdout.trim();
    const expectedOutput = String(tc.expected_output || '').trim();
    const isPassed = !result.timedOut && result.success && actualOutput === expectedOutput;

    totalTime += result.executionTimeMs;
    
    console.log(`[CodeArena] Test case ${tc.id}: Passed=${isPassed}, Expected=${JSON.stringify(expectedOutput.substring(0, 100))}, Actual=${JSON.stringify(actualOutput.substring(0, 100))}`);

    results.push({
      test_case_id: tc.id,
      actual_output: actualOutput,
      is_passed: isPassed,
      execution_time_ms: result.executionTimeMs,
      error_log: result.timedOut ? 'Timed out' : (result.stderr || null),
      timed_out: result.timedOut,
    });

    // Stop on first runtime error (compilation error applies to all)
    if (!result.timedOut && !result.success && result.exitCode !== 0) {
      // Fill remaining test cases as runtime error
      for (let i = results.length; i < testCases.length; i++) {
        results.push({
          test_case_id: testCases[i].id,
          actual_output: '',
          is_passed: false,
          execution_time_ms: 0,
          error_log: 'Skipped due to earlier error',
          timed_out: false,
        });
      }
      break;
    }
  }

  const allPassed = results.every((r) => r.is_passed);
  const anyTimeout = results.some((r) => r.timed_out);
  const anyError = results.some((r) => r.error_log && !r.timed_out && !r.is_passed);

  let overallResult;
  if (allPassed) {
    overallResult = 'accepted';
  } else if (anyTimeout) {
    overallResult = 'timeout';
  } else if (anyError) {
    overallResult = 'runtime_error';
  } else {
    overallResult = 'wrong_answer';
  }

  return { overallResult, results, totalExecutionTimeMs: totalTime, error: null };
};

export default { executeCode, evaluateAgainstTestCases };
