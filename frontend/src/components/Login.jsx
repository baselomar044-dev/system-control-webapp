import React, { useState } from 'react';
import {
  Box, Button, TextField, Typography, Alert, CircularProgress,
  InputAdornment, IconButton, Paper, Avatar,
} from '@mui/material';
import { Visibility, VisibilityOff, Computer } from '@mui/icons-material';
import { authLogin, getMe } from '../services/api';
import { login as saveLogin } from '../utils/auth';

export default function Login({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authLogin(username, password);
      const token = res.data.access_token || res.data.token;
      let user = null;
      try {
        const meRes = await getMe();
        user = meRes.data;
      } catch {
        user = { username };
      }
      saveLogin(token, user);
      onSuccess?.();
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Invalid credentials. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1f3a 100%)',
      }}
    >
      <Paper
        elevation={8}
        sx={{
          p: 5,
          width: '100%',
          maxWidth: 420,
          borderRadius: 3,
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, mb: 2 }}>
            <Computer sx={{ fontSize: 36 }} />
          </Avatar>
          <Typography variant="h5" fontWeight={700} color="white">
            System Control
          </Typography>
          <Typography variant="body2" color="grey.400" mt={0.5}>
            Sign in to manage your system
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            required
            autoFocus
            autoComplete="username"
            sx={{ mb: 2 }}
            InputLabelProps={{ style: { color: '#aaa' } }}
            InputProps={{ style: { color: 'white' } }}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover fieldset': { borderColor: 'primary.main' },
              },
              '& .MuiInputLabel-root': { color: 'grey.400' },
            }}
          />
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((s) => !s)}
                    edge="end"
                    sx={{ color: 'grey.400' }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover fieldset': { borderColor: 'primary.main' },
              },
              '& .MuiInputLabel-root': { color: 'grey.400' },
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ py: 1.5, fontWeight: 600, fontSize: '1rem' }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
