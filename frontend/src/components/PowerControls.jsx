import React, { useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardActions,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, CircularProgress, Snackbar,
} from '@mui/material';
import {
  PowerSettingsNew, Refresh, Hotel, Lock, Warning,
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { shutdown, restart, sleep, lockScreen } from '../services/api';

const ACTIONS = [
  {
    id: 'shutdown',
    label: 'Shutdown',
    description: 'Power off the system immediately',
    icon: <PowerSettingsNew sx={{ fontSize: 40 }} />,
    color: '#f44336',
    bgColor: 'rgba(244,67,54,0.1)',
    borderColor: 'rgba(244,67,54,0.3)',
    confirm: true,
    confirmMsg: 'Are you sure you want to shut down the system? All unsaved work will be lost.',
  },
  {
    id: 'restart',
    label: 'Restart',
    description: 'Reboot the system immediately',
    icon: <Refresh sx={{ fontSize: 40 }} />,
    color: '#ff9800',
    bgColor: 'rgba(255,152,0,0.1)',
    borderColor: 'rgba(255,152,0,0.3)',
    confirm: true,
    confirmMsg: 'Are you sure you want to restart the system? All unsaved work will be lost.',
  },
  {
    id: 'sleep',
    label: 'Sleep',
    description: 'Put the system into sleep mode',
    icon: <Hotel sx={{ fontSize: 40 }} />,
    color: '#2196f3',
    bgColor: 'rgba(33,150,243,0.1)',
    borderColor: 'rgba(33,150,243,0.3)',
    confirm: false,
  },
  {
    id: 'lock',
    label: 'Lock Screen',
    description: 'Lock the screen immediately',
    icon: <Lock sx={{ fontSize: 40 }} />,
    color: '#9c27b0',
    bgColor: 'rgba(156,39,176,0.1)',
    borderColor: 'rgba(156,39,176,0.3)',
    confirm: false,
  },
];

export default function PowerControls() {
  const [confirmAction, setConfirmAction] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const mutations = {
    shutdown: useMutation({ mutationFn: () => shutdown(), onSuccess: () => setSnack({ open: true, message: 'Shutdown initiated', severity: 'info' }), onError: (e) => setSnack({ open: true, message: e.response?.data?.detail || 'Failed', severity: 'error' }) }),
    restart: useMutation({ mutationFn: () => restart(), onSuccess: () => setSnack({ open: true, message: 'Restart initiated', severity: 'info' }), onError: (e) => setSnack({ open: true, message: e.response?.data?.detail || 'Failed', severity: 'error' }) }),
    sleep: useMutation({ mutationFn: () => sleep(), onSuccess: () => setSnack({ open: true, message: 'Sleep initiated', severity: 'success' }), onError: (e) => setSnack({ open: true, message: e.response?.data?.detail || 'Failed', severity: 'error' }) }),
    lock: useMutation({ mutationFn: () => lockScreen(), onSuccess: () => setSnack({ open: true, message: 'Screen locked', severity: 'success' }), onError: (e) => setSnack({ open: true, message: e.response?.data?.detail || 'Failed', severity: 'error' }) }),
  };

  const handleAction = (action) => {
    if (action.confirm) {
      setConfirmAction(action);
    } else {
      mutations[action.id].mutate();
    }
  };

  const handleConfirm = () => {
    if (confirmAction) {
      mutations[confirmAction.id].mutate();
      setConfirmAction(null);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} color="white" gutterBottom>
        Power Controls
      </Typography>
      <Typography variant="body2" color="grey.500" sx={{ mb: 4 }}>
        Manage system power state. Destructive actions require confirmation.
      </Typography>

      <Grid container spacing={3} justifyContent="center">
        {ACTIONS.map((action) => {
          const mut = mutations[action.id];
          return (
            <Grid item xs={12} sm={6} md={3} key={action.id}>
              <Card
                sx={{
                  background: action.bgColor,
                  border: `1px solid ${action.borderColor}`,
                  borderRadius: 3,
                  textAlign: 'center',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 24px ${action.bgColor}` },
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ color: action.color, mb: 2, mt: 1 }}>
                    {action.icon}
                  </Box>
                  <Typography variant="h6" fontWeight={700} sx={{ color: action.color }} gutterBottom>
                    {action.label}
                  </Typography>
                  <Typography variant="body2" color="grey.400">
                    {action.description}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => handleAction(action)}
                    disabled={mut.isPending}
                    sx={{
                      color: action.color,
                      borderColor: action.borderColor,
                      '&:hover': { background: action.bgColor, borderColor: action.color },
                      minWidth: 120,
                    }}
                  >
                    {mut.isPending ? <CircularProgress size={20} sx={{ color: action.color }} /> : action.label}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Confirm Dialog */}
      <Dialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        PaperProps={{ sx: { background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 } }}
      >
        <DialogTitle sx={{ color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning sx={{ color: confirmAction?.color }} />
          Confirm {confirmAction?.label}
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {confirmAction?.confirmMsg}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAction(null)} sx={{ color: 'grey.400' }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            sx={{ bgcolor: confirmAction?.color, '&:hover': { bgcolor: confirmAction?.color, filter: 'brightness(0.85)' } }}
          >
            Yes, {confirmAction?.label}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
