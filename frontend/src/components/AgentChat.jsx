import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, TextField, IconButton, Paper, Avatar,
  CircularProgress, Alert, Tooltip, Divider, Chip,
} from '@mui/material';
import { Send, SmartToy, Person, Delete, ContentCopy } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sendMessage, getChatHistory } from '../services/api';

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: 1.5,
        mb: 2,
        alignItems: 'flex-start',
      }}
    >
      <Avatar
        sx={{
          width: 32,
          height: 32,
          bgcolor: isUser ? 'primary.main' : '#1a1f3a',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.15)',
          flexShrink: 0,
        }}
      >
        {isUser ? <Person sx={{ fontSize: 18 }} /> : <SmartToy sx={{ fontSize: 18 }} />}
      </Avatar>
      <Box sx={{ maxWidth: '75%', minWidth: 60 }}>
        <Box
          sx={{
            background: isUser ? 'rgba(33,150,243,0.2)' : 'rgba(255,255,255,0.06)',
            border: isUser ? '1px solid rgba(33,150,243,0.4)' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
            px: 2,
            py: 1.5,
            position: 'relative',
            '&:hover .copy-btn': { opacity: 1 },
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'grey.100',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.7,
            }}
          >
            {msg.content}
          </Typography>
          <Tooltip title={copied ? 'Copied!' : 'Copy'}>
            <IconButton
              className="copy-btn"
              size="small"
              onClick={handleCopy}
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                opacity: 0,
                color: 'grey.500',
                transition: 'opacity 0.2s',
                '&:hover': { color: 'grey.300' },
              }}
            >
              <ContentCopy sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography variant="caption" color="grey.700" sx={{ mt: 0.5, display: 'block', textAlign: isUser ? 'right' : 'left' }}>
          {msg.timestamp ? new Date(msg.timestamp * 1000).toLocaleTimeString() : ''}
        </Typography>
      </Box>
    </Box>
  );
}

function TypingIndicator() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
      <Avatar sx={{ width: 32, height: 32, bgcolor: '#1a1f3a', border: '1px solid rgba(255,255,255,0.15)' }}>
        <SmartToy sx={{ fontSize: 18 }} />
      </Avatar>
      <Box
        sx={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '4px 16px 16px 16px',
          px: 2,
          py: 1.5,
          display: 'flex',
          gap: 0.5,
          alignItems: 'center',
        }}
      >
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: 'grey.500',
              animation: 'pulse 1.4s infinite',
              animationDelay: `${i * 0.2}s`,
              '@keyframes pulse': {
                '0%, 80%, 100%': { opacity: 0.3, transform: 'scale(0.8)' },
                '40%': { opacity: 1, transform: 'scale(1)' },
              },
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

export default function AgentChat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { data: historyData } = useQuery({
    queryKey: ['chatHistory', sessionId],
    queryFn: () => getChatHistory(sessionId).then((r) => r.data),
    onSuccess: (data) => {
      if (data?.messages?.length) setMessages(data.messages);
    },
  });

  const sendMutation = useMutation({
    mutationFn: ({ msg }) => sendMessage(msg, sessionId),
    onMutate: ({ msg }) => {
      const userMsg = { role: 'user', content: msg, timestamp: Date.now() / 1000 };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);
      setInput('');
    },
    onSuccess: (res) => {
      setIsTyping(false);
      const reply = res.data?.response || res.data?.message || res.data?.content;
      if (reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: reply, timestamp: Date.now() / 1000 }]);
      }
    },
    onError: (err) => {
      setIsTyping(false);
      const errMsg = err.response?.data?.detail || 'Failed to get response from agent';
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ Error: ${errMsg}`, timestamp: Date.now() / 1000 }]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate({ msg: trimmed });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SmartToy sx={{ color: 'primary.main' }} />
          <Typography variant="h5" fontWeight={700} color="white">
            AI Agent
          </Typography>
          <Chip label="Beta" size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
        </Box>
        <Tooltip title="Clear conversation">
          <IconButton size="small" onClick={handleClear} sx={{ color: 'grey.500' }}>
            <Delete fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Messages */}
      <Paper
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 2,
          mb: 2,
        }}
      >
        {messages.length === 0 && !isTyping && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, color: 'grey.600' }}>
            <SmartToy sx={{ fontSize: 64, mb: 2, color: 'grey.700' }} />
            <Typography variant="h6" color="grey.600" gutterBottom>
              How can I help you?
            </Typography>
            <Typography variant="body2" color="grey.700" textAlign="center">
              Ask me about system status, run commands,<br />manage files, or anything else.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 3, justifyContent: 'center' }}>
              {[
                'What is my CPU usage?',
                'List running processes',
                'Show disk usage',
                'What OS am I on?',
              ].map((suggestion) => (
                <Chip
                  key={suggestion}
                  label={suggestion}
                  size="small"
                  onClick={() => setInput(suggestion)}
                  sx={{
                    cursor: 'pointer',
                    color: 'grey.400',
                    borderColor: 'rgba(255,255,255,0.15)',
                    '&:hover': { background: 'rgba(255,255,255,0.08)' },
                  }}
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {isTyping && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </Paper>

      {/* Input */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 3,
          p: 0.5,
          pl: 2,
          alignItems: 'flex-end',
        }}
      >
        <TextField
          inputRef={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the AI agent… (Shift+Enter for newline)"
          multiline
          maxRows={4}
          fullWidth
          variant="standard"
          InputProps={{ disableUnderline: true }}
          inputProps={{ style: { color: '#e0e0e0', fontSize: '0.9rem' } }}
          disabled={sendMutation.isPending}
        />
        <Tooltip title="Send (Enter)">
          <span>
            <IconButton
              onClick={handleSend}
              disabled={!input.trim() || sendMutation.isPending}
              sx={{
                color: input.trim() && !sendMutation.isPending ? 'primary.main' : 'grey.700',
                transition: 'color 0.2s',
                mb: 0.5,
              }}
            >
              {sendMutation.isPending ? <CircularProgress size={20} /> : <Send />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      <Typography variant="caption" color="grey.700" sx={{ mt: 0.5, px: 1 }}>
        Session: {sessionId} · {messages.length} messages
      </Typography>
    </Box>
  );
}
