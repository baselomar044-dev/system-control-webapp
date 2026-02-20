import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TableSortLabel, Paper, TextField, IconButton,
  Tooltip, Chip, Alert, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, InputAdornment, Snackbar,
} from '@mui/material';
import { Search, Close, Refresh, Warning } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listProcesses, killProcess } from '../services/api';

function formatMem(bytes) {
  if (bytes == null) return '—';
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function ProcessManager() {
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState('cpu_percent');
  const [order, setOrder] = useState('desc');
  const [killTarget, setKillTarget] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['processes'],
    queryFn: () => listProcesses().then((r) => r.data),
    refetchInterval: 5000,
  });

  const killMutation = useMutation({
    mutationFn: ({ pid }) => killProcess(pid),
    onSuccess: () => {
      qc.invalidateQueries(['processes']);
      setSnack({ open: true, message: `Process ${killTarget?.pid} killed`, severity: 'success' });
      setKillTarget(null);
    },
    onError: (e) => {
      setSnack({ open: true, message: e.response?.data?.detail || 'Kill failed', severity: 'error' });
    },
  });

  const handleSort = (col) => {
    if (orderBy === col) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderBy(col);
      setOrder('desc');
    }
  };

  const processes = (data?.processes || [])
    .filter((p) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.name?.toLowerCase().includes(q) ||
        String(p.pid).includes(q) ||
        p.username?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const av = a[orderBy] ?? 0;
      const bv = b[orderBy] ?? 0;
      return order === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  const columns = [
    { id: 'pid', label: 'PID', width: 80 },
    { id: 'name', label: 'Name', width: 200 },
    { id: 'username', label: 'User', width: 120 },
    { id: 'cpu_percent', label: 'CPU %', width: 100 },
    { id: 'memory_info', label: 'Memory', width: 120 },
    { id: 'status', label: 'Status', width: 100 },
  ];

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={700} color="white">
          Process Manager
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="grey.500">
            {processes.length} processes
          </Typography>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={() => refetch()} sx={{ color: 'grey.400' }}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <TextField
        placeholder="Search by name, PID or user…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
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
          mb: 2,
          '& .MuiOutlinedInput-root': {
            color: 'white',
            '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
          },
          '& .MuiInputLabel-root': { color: 'grey.400' },
        }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load processes: {error.response?.data?.detail || error.message}
        </Alert>
      )}

      <TableContainer
        component={Paper}
        sx={{ flex: 1, overflow: 'auto', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  sortDirection={orderBy === col.id ? order : false}
                  sx={{ background: '#0f1429', color: 'grey.400', borderBottom: '1px solid rgba(255,255,255,0.08)', width: col.width }}
                >
                  <TableSortLabel
                    active={orderBy === col.id}
                    direction={orderBy === col.id ? order : 'asc'}
                    onClick={() => handleSort(col.id)}
                    sx={{ color: 'grey.400 !important', '& .MuiTableSortLabel-icon': { color: 'grey.500 !important' } }}
                  >
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell sx={{ background: '#0f1429', color: 'grey.400', borderBottom: '1px solid rgba(255,255,255,0.08)', width: 80 }}>
                Action
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, border: 'none' }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : processes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'grey.500', border: 'none' }}>
                  No processes found
                </TableCell>
              </TableRow>
            ) : (
              processes.map((proc) => (
                <TableRow
                  key={proc.pid}
                  hover
                  sx={{ '&:hover': { background: 'rgba(255,255,255,0.04)' }, '& td': { borderBottom: '1px solid rgba(255,255,255,0.04)' } }}
                >
                  <TableCell sx={{ color: 'grey.400', fontFamily: 'monospace' }}>{proc.pid}</TableCell>
                  <TableCell sx={{ color: 'grey.200', fontWeight: 500 }}>{proc.name}</TableCell>
                  <TableCell sx={{ color: 'grey.500' }}>{proc.username}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography
                        variant="body2"
                        sx={{ color: proc.cpu_percent > 50 ? '#f44336' : proc.cpu_percent > 20 ? '#ff9800' : '#4caf50' }}
                      >
                        {proc.cpu_percent?.toFixed(1) ?? '0.0'}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'grey.400' }}>
                    {formatMem(proc.memory_info?.rss)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={proc.status || 'unknown'}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        bgcolor: proc.status === 'running' ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.06)',
                        color: proc.status === 'running' ? '#4caf50' : 'grey.400',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Kill process">
                      <IconButton
                        size="small"
                        onClick={() => setKillTarget(proc)}
                        sx={{ color: 'grey.600', '&:hover': { color: '#f44336' } }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Kill Confirm Dialog */}
      <Dialog
        open={!!killTarget}
        onClose={() => setKillTarget(null)}
        PaperProps={{ sx: { background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' } }}
      >
        <DialogTitle sx={{ color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="warning" /> Confirm Kill
        </DialogTitle>
        <DialogContent>
          <Typography color="grey.300">
            Kill process <strong>{killTarget?.name}</strong> (PID: {killTarget?.pid})?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKillTarget(null)} sx={{ color: 'grey.400' }}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => killMutation.mutate({ pid: killTarget?.pid })}
            disabled={killMutation.isPending}
          >
            {killMutation.isPending ? <CircularProgress size={18} /> : 'Kill'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
