import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, IconButton, Tooltip, Alert,
  CircularProgress, Switch, FormControlLabel, Snackbar,
  Paper, Grid, Card, CardMedia, CardActions,
} from '@mui/material';
import { CameraAlt, Download, Refresh, Delete, AutoMode } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { takeScreenshot, getScreenshots, deleteScreenshot } from '../services/api';

export default function ScreenViewer() {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [activeImg, setActiveImg] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const autoRefreshRef = useRef(null);
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['screenshots'],
    queryFn: () => getScreenshots().then((r) => r.data),
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const takeMutation = useMutation({
    mutationFn: () => takeScreenshot(),
    onSuccess: (res) => {
      qc.invalidateQueries(['screenshots']);
      const img = res.data?.url || res.data?.filename;
      if (img) setActiveImg(img);
      setSnack({ open: true, message: 'Screenshot taken', severity: 'success' });
    },
    onError: (e) => setSnack({ open: true, message: e.response?.data?.detail || 'Failed', severity: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (filename) => deleteScreenshot(filename),
    onSuccess: () => {
      qc.invalidateQueries(['screenshots']);
      setSnack({ open: true, message: 'Deleted', severity: 'success' });
      setActiveImg(null);
    },
    onError: (e) => setSnack({ open: true, message: e.response?.data?.detail || 'Failed', severity: 'error' }),
  });

  const handleDownload = (url, name) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name || 'screenshot.png';
    a.target = '_blank';
    a.click();
  };

  const screenshots = data?.screenshots || [];
  const latest = screenshots[0];

  useEffect(() => {
    if (latest && !activeImg) setActiveImg(latest.url || latest.filename);
  }, [latest]);

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={700} color="white">
          Screen Viewer
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                sx={{ '& .MuiSwitch-thumb': { color: autoRefresh ? 'primary.main' : 'grey.600' } }}
              />
            }
            label={<Typography variant="caption" color="grey.400">Auto</Typography>}
            sx={{ mr: 0 }}
          />
          <Tooltip title="Refresh list">
            <IconButton size="small" onClick={() => refetch()} sx={{ color: 'grey.400' }}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={takeMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <CameraAlt />}
            onClick={() => takeMutation.mutate()}
            disabled={takeMutation.isPending}
            size="small"
          >
            Capture
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.response?.data?.detail || error.message}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        {/* Preview */}
        <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Paper
            sx={{
              flex: 1,
              background: '#0d1117',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              minHeight: 320,
              position: 'relative',
            }}
          >
            {activeImg ? (
              <>
                <img
                  src={activeImg.startsWith('http') ? activeImg : `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}${activeImg}`}
                  alt="Screenshot"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                />
                <Box sx={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 1 }}>
                  <Tooltip title="Download">
                    <IconButton
                      size="small"
                      sx={{ background: 'rgba(0,0,0,0.7)', color: 'white', '&:hover': { background: 'rgba(0,0,0,0.9)' } }}
                      onClick={() => handleDownload(activeImg, 'screenshot.png')}
                    >
                      <Download fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </>
            ) : (
              <Box sx={{ textAlign: 'center', color: 'grey.700' }}>
                <CameraAlt sx={{ fontSize: 64, mb: 1 }} />
                <Typography>Click "Capture" to take a screenshot</Typography>
              </Box>
            )}
            {(takeMutation.isPending || isLoading) && (
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                <CircularProgress />
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Thumbnail list */}
        <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="subtitle2" color="grey.400" gutterBottom>
            Recent Screenshots ({screenshots.length})
          </Typography>
          <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {screenshots.length === 0 && !isLoading && (
              <Typography variant="body2" color="grey.700" sx={{ mt: 2, textAlign: 'center' }}>
                No screenshots yet
              </Typography>
            )}
            {screenshots.map((shot) => {
              const url = shot.url || shot.filename;
              const fullUrl = url?.startsWith('http') ? url : `http://localhost:8000${url}`;
              return (
                <Card
                  key={shot.filename || shot.url}
                  onClick={() => setActiveImg(fullUrl)}
                  sx={{
                    background: activeImg === fullUrl ? 'rgba(33,150,243,0.15)' : 'rgba(255,255,255,0.04)',
                    border: activeImg === fullUrl ? '1px solid rgba(33,150,243,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1 }}>
                    {fullUrl && (
                      <img
                        src={fullUrl}
                        alt="thumb"
                        style={{ width: 72, height: 48, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="caption" color="grey.300" noWrap display="block">
                        {shot.filename}
                      </Typography>
                      {shot.created_at && (
                        <Typography variant="caption" color="grey.600">
                          {new Date(shot.created_at * 1000).toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Tooltip title="Download">
                        <IconButton size="small" sx={{ color: 'grey.500' }} onClick={(e) => { e.stopPropagation(); handleDownload(fullUrl, shot.filename); }}>
                          <Download sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" sx={{ color: 'grey.500' }} onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(shot.filename); }}>
                          <Delete sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Card>
              );
            })}
          </Box>
        </Grid>
      </Grid>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
