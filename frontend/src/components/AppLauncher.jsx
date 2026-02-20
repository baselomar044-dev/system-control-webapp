import React, { useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardActions,
  Button, TextField, InputAdornment, IconButton, Alert,
  CircularProgress, Snackbar, Chip, Skeleton,
} from '@mui/material';
import { Search, Close, Launch, Apps } from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { listApps, launchApp } from '../services/api';

const APP_ICONS = {
  browser: '🌐', terminal: '💻', files: '📁', text: '📝',
  calculator: '🧮', music: '🎵', video: '🎬', image: '🖼️',
  settings: '⚙️', mail: '📧', calendar: '📅', default: '📦',
};

function getIcon(app) {
  const name = (app.name || '').toLowerCase();
  for (const [key, icon] of Object.entries(APP_ICONS)) {
    if (name.includes(key)) return icon;
  }
  return APP_ICONS.default;
}

export default function AppLauncher() {
  const [search, setSearch] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const [view, setView] = useState('grid');

  const { data, isLoading, error } = useQuery({
    queryKey: ['apps'],
    queryFn: () => listApps().then((r) => r.data),
  });

  const launchMutation = useMutation({
    mutationFn: ({ appId }) => launchApp(appId),
    onSuccess: (_, { name }) => setSnack({ open: true, message: `Launched ${name}`, severity: 'success' }),
    onError: (e) => setSnack({ open: true, message: e.response?.data?.detail || 'Launch failed', severity: 'error' }),
  });

  const apps = (data?.apps || []).filter((app) =>
    !search || app.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={700} color="white">
          App Launcher
        </Typography>
        <Chip
          icon={<Apps />}
          label={`${apps.length} apps`}
          size="small"
          variant="outlined"
          sx={{ color: 'grey.400', borderColor: 'rgba(255,255,255,0.2)' }}
        />
      </Box>

      <TextField
        placeholder="Search applications…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        fullWidth
        InputProps={{
          startAdornment: <InputAdornment position="start"><Search sx={{ color: 'grey.500' }} /></InputAdornment>,
          endAdornment: search && (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setSearch('')} sx={{ color: 'grey.500' }}>
                <Close fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{
          mb: 3,
          '& .MuiOutlinedInput-root': {
            color: 'white',
            '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
          },
        }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load apps: {error.response?.data?.detail || error.message}
        </Alert>
      )}

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {isLoading ? (
          <Grid container spacing={2}>
            {[1, 2, 3, 4, 6, 8].map((i) => (
              <Grid item xs={6} sm={4} md={3} key={i}>
                <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)' }} />
              </Grid>
            ))}
          </Grid>
        ) : apps.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, color: 'grey.600' }}>
            <Apps sx={{ fontSize: 64, mb: 1 }} />
            <Typography>{search ? `No apps matching "${search}"` : 'No apps available'}</Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {apps.map((app) => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={app.id || app.name}>
                <Card
                  sx={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      background: 'rgba(33,150,243,0.1)',
                      borderColor: 'rgba(33,150,243,0.3)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <CardContent sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: '2rem', mb: 1 }}>{getIcon(app)}</Typography>
                    <Typography variant="body2" fontWeight={600} color="grey.200" noWrap>
                      {app.name}
                    </Typography>
                    {app.category && (
                      <Typography variant="caption" color="grey.600">
                        {app.category}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'center', pt: 0, pb: 1.5 }}>
                    <Button
                      size="small"
                      startIcon={launchMutation.isPending && launchMutation.variables?.appId === app.id ? <CircularProgress size={14} /> : <Launch fontSize="small" />}
                      onClick={() => launchMutation.mutate({ appId: app.id || app.name, name: app.name })}
                      disabled={launchMutation.isPending}
                      sx={{ color: 'primary.main', fontSize: '0.75rem' }}
                    >
                      Launch
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
