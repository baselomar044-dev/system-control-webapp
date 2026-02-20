import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Typography, TextField, IconButton, Tooltip, Chip,
  Alert, CircularProgress, Paper, Divider,
} from '@mui/material';
import { Send, Delete, ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { executeCommand } from '../services/api';

const PROMPT_COLOR = '#4caf50';
const MAX_HISTORY = 200;
const WELCOME = [
  { type: 'system', text: 'System Control Terminal — type a command and press Enter' },
  { type: 'system', text: 'Use ↑/↓ arrows to navigate command history' },
];

export default function Terminal() {
  const [input, setInput] = useState('');
  const [cwd, setCwd] = useState('~');
  const [lines, setLines] = useState(WELCOME);
  const [cmdHistory, setCmdHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const outputRef = useRef(null);
  const inputRef = useRef(null);

  const execMutation = useMutation({
    mutationFn: ({ cmd }) => executeCommand(cmd, null, 30),
    onSuccess: (res, { cmd }) => {
      const d = res.data;
      const newLines = [];
      if (d.stdout) {
        d.stdout.split('\n').forEach((l) => newLines.push({ type: 'stdout', text: l }));
      }
      if (d.stderr) {
        d.stderr.split('\n').filter(Boolean).forEach((l) =>
          newLines.push({ type: 'stderr', text: l })
        );
      }
      if (d.returncode !== 0 && !d.stdout && !d.stderr) {
        newLines.push({ type: 'stderr', text: `Process exited with code ${d.returncode}` });
      }
      if (d.cwd) setCwd(d.cwd);
      setLines((prev) => [...prev, ...newLines].slice(-MAX_HISTORY));
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || err.message || 'Command failed';
      setLines((prev) => [...prev, { type: 'error', text: msg }].slice(-MAX_HISTORY));
    },
  });

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  const handleSubmit = useCallback(() => {
    const cmd = input.trim();
    if (!cmd) return;
    setLines((prev) => [
      ...prev,
      { type: 'prompt', text: `${cwd} $ ${cmd}` },
    ].slice(-MAX_HISTORY));
    setCmdHistory((prev) => [cmd, ...prev].slice(0, 100));
    setHistIdx(-1);
    setInput('');
    execMutation.mutate({ cmd });
  }, [input, cwd]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(next);
      if (cmdHistory[next] !== undefined) setInput(cmdHistory[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(histIdx - 1, -1);
      setHistIdx(next);
      setInput(next === -1 ? '' : cmdHistory[next] || '');
    }
  };

  const lineColor = (type) => {
    switch (type) {
      case 'prompt': return '#4caf50';
      case 'stderr': return '#f44336';
      case 'error': return '#ff5722';
      case 'system': return '#607d8b';
      default: return '#e0e0e0';
    }
  };

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={700} color="white">
          Terminal
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {execMutation.isPending && <CircularProgress size={16} />}
          <Chip label={cwd} size="small" variant="outlined" sx={{ color: PROMPT_COLOR, borderColor: PROMPT_COLOR, fontFamily: 'monospace', fontSize: '0.75rem' }} />
          <Tooltip title="Clear terminal">
            <IconButton size="small" onClick={() => setLines(WELCOME)} sx={{ color: 'grey.500' }}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Output */}
      <Paper
        ref={outputRef}
        onClick={() => inputRef.current?.focus()}
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          background: '#0d1117',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 2,
          fontFamily: "'Roboto Mono', monospace",
          fontSize: '0.82rem',
          lineHeight: 1.6,
          cursor: 'text',
          mb: 1,
        }}
      >
        {lines.map((line, i) => (
          <Box key={i} sx={{ color: lineColor(line.type), whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {line.text}
          </Box>
        ))}
        {execMutation.isPending && (
          <Box sx={{ color: '#607d8b', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={12} sx={{ color: '#607d8b' }} />
            <span>Running…</span>
          </Box>
        )}
      </Paper>

      {/* Input */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, px: 2, py: 0.5 }}>
        <Typography sx={{ color: PROMPT_COLOR, fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
          {cwd} $
        </Typography>
        <TextField
          inputRef={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          variant="standard"
          fullWidth
          autoFocus
          disabled={execMutation.isPending}
          InputProps={{ disableUnderline: true }}
          inputProps={{
            style: {
              fontFamily: "'Roboto Mono', monospace",
              fontSize: '0.85rem',
              color: '#e0e0e0',
              caretColor: '#4caf50',
            },
          }}
        />
        <Tooltip title="Run (Enter)">
          <span>
            <IconButton
              size="small"
              onClick={handleSubmit}
              disabled={!input.trim() || execMutation.isPending}
              sx={{ color: input.trim() ? PROMPT_COLOR : 'grey.700' }}
            >
              <Send fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      <Typography variant="caption" color="grey.700" sx={{ mt: 0.5, pl: 1 }}>
        {cmdHistory.length} commands in history · ↑↓ to navigate
      </Typography>
    </Box>
  );
}
