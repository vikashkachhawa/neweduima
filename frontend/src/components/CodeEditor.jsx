import React, { useRef, useEffect, useCallback } from 'react';
import { Box, Select, MenuItem, FormControl, InputLabel, Typography, useTheme } from '@mui/material';

const LANGUAGE_LABELS = {
  python: 'Python 3',
  javascript: 'JavaScript (Node.js)',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
};

const LANGUAGE_PLACEHOLDERS = {
  python: `# Write your Python solution here\n\nimport sys\ninput = sys.stdin.readline\n\ndef solve():\n    n = int(input())\n    print(n)\n\nsolve()`,
  javascript: `// Write your JavaScript solution here\n\nconst lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');\nconst n = parseInt(lines[0]);\nconsole.log(n);`,
  java: `import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        System.out.println(n);\n    }\n}`,
  c: `#include <stdio.h>\n\nint main() {\n    int n;\n    scanf("%d", &n);\n    printf("%d\\n", n);\n    return 0;\n}`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    int n;\n    cin >> n;\n    cout << n << endl;\n    return 0;\n}`,
};

/**
 * Minimal styled code editor built on a <textarea>.
 * Supports tab insertion, auto-indentation, and line numbers.
 */
const CodeEditor = ({
  value,
  onChange,
  language = 'python',
  onLanguageChange,
  readOnly = false,
  height = 400,
  showLanguageSelect = true,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  const bg = isDark ? '#0d1117' : '#f8f9fa';
  const fg = isDark ? '#e6edf3' : '#1a1a2e';
  const gutterBg = isDark ? '#161b22' : '#eef0f3';
  const gutterFg = isDark ? '#484f58' : '#8c8c9e';
  const borderColor = isDark ? '#30363d' : '#d0d7de';

  // Sync line numbers with textarea scroll
  const syncScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.addEventListener('scroll', syncScroll, { passive: true });
      return () => ta.removeEventListener('scroll', syncScroll);
    }
  }, [syncScroll]);

  const lines = (value || '').split('\n');
  const lineCount = Math.max(lines.length, 1);

  const handleKeyDown = (e) => {
    if (readOnly) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.target;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = value.substring(0, start) + '    ' + value.substring(end);
      onChange(newValue);
      // Restore cursor
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 4;
      });
    }
  };

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    if (onLanguageChange) {
      onLanguageChange(lang);
      // Offer placeholder only if current code is empty or default
      if (!value || value.trim() === '' || Object.values(LANGUAGE_PLACEHOLDERS).includes(value)) {
        onChange(LANGUAGE_PLACEHOLDERS[lang] || '');
      }
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {showLanguageSelect && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Language</InputLabel>
            <Select value={language} label="Language" onChange={handleLanguageChange} disabled={readOnly}>
              {Object.entries(LANGUAGE_LABELS).map(([key, label]) => (
                <MenuItem key={key} value={key}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            Tab = 4 spaces
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          border: `1px solid ${borderColor}`,
          borderRadius: 1,
          overflow: 'hidden',
          fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
          fontSize: '13px',
          lineHeight: '1.6',
          height,
        }}
      >
        {/* Line numbers */}
        <Box
          ref={lineNumbersRef}
          sx={{
            backgroundColor: gutterBg,
            color: gutterFg,
            padding: '12px 8px 12px 12px',
            borderRight: `1px solid ${borderColor}`,
            minWidth: '44px',
            textAlign: 'right',
            overflow: 'hidden',
            userSelect: 'none',
            whiteSpace: 'pre',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            lineHeight: 'inherit',
            flexShrink: 0,
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => i + 1).join('\n')}
        </Box>

        {/* Code textarea */}
        <Box
          component="textarea"
          ref={textareaRef}
          value={value}
          onChange={readOnly ? undefined : (e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          sx={{
            flex: 1,
            backgroundColor: bg,
            color: fg,
            border: 'none',
            outline: 'none',
            resize: 'none',
            padding: '12px',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            lineHeight: 'inherit',
            overflow: 'auto',
            whiteSpace: 'pre',
            tabSize: 4,
            cursor: readOnly ? 'default' : 'text',
            caretColor: isDark ? '#58a6ff' : '#0969da',
          }}
        />
      </Box>
    </Box>
  );
};

export default CodeEditor;
export { LANGUAGE_LABELS, LANGUAGE_PLACEHOLDERS };
