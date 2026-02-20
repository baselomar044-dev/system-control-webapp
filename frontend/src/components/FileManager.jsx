import React, { useState, useCallback, useRef } from 'react';
import {
  Box, Typography, Breadcrumbs, Link, IconButton, Button, Tooltip,
  List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction,
  Chip, Alert, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Snackbar, Divider, Paper,
} from '@mui/material';
import {
  Folder, InsertDriveFile, ArrowUpward, CreateNewFolder,
  Delete, Download, Upload, Refresh, Home, Close,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listFiles, createFile, deleteFile, uploadFile, downloadFile,
} from '../services/api';

function formatSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleString();
}

export default function FileManager() {
  const [currentPath, setCurrentPath] = useState('/');
  const [selected, setSelected] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createIsDir, setCreateIsDir] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['files', currentPath],
    queryFn: () => listFiles(currentPath).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: ({ path, isDir }) => createFile(path, isDir),
    onSuccess: () => { qc.invalidateQueries(['files']); setSnack({ open: true, message: 'Created successfully', severity: 'success' }); setCreateDialogOpen(false); setNewName(''); },
    onError: (e) => setSnack({ open: true, message: e.response?.data?.detail || 'Create failed', severity: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (path) => deleteFile(path),
    onSuccess: () => { qc.invalidateQueries(['files']); setSnack({ open: true, message: 'Deleted', severity: 'success' }); setDeleteDialogOpen(false); setDeleteTarget(null); },
    onError: (e) => setSnack({ open: true, message: e.response?.data?.detail || 'Delete failed', severity: 'error' }),
  });

  const uploadMutation = useMutation({
    mutationFn: (file) => uploadFile(currentPath, file),
    onSuccess: () => { qc.invalidateQueries(['files']); setSnack({ open: true, message: 'Uploaded successfully', severity: 'success' }); },
    onError: (e) => setSnack({ open: true, message: e.response?.data?.detail || 'Upload failed', severity: 'error' }),
  });

  const navigate = (path) => { setCurrentPath(path); setSelected(null); };

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.replace(/\/$/, '').split('/');
    parts.pop();
    navigate(parts.length === 0 ? '/' : parts.join('/') || '/');
  };

  const breadcrumbs = currentPath === '/'
    ? [{ label: 'Root', path: '/' }]
    : ['/', ...currentPath.split('/').filter(Boolean)].reduce((acc, part, i, arr) => {
        if (part === '/') return [{ label: 'Root', path: '/' }];
        const path = '/' + arr.slice(1, i + 1).join('/');
        return [...acc, { label: part, path }];
      }, [{ label: 'Root', path: '/' }]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach((f) => uploadMutation.mutate(f));
  }, [currentPath]);

  const handleDownload = async (item) => {
    try {
      const res = await downloadFile(item.path);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setSnack({ open: true, message: 'Download failed', severity: 'error' });
    }
  };

  const items = data?.items || [];

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={700} color="white">
          File Manager
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Upload file">
            <IconButton onClick={() => fileInputRef.current?.click()} sx={{ color: 'grey.400' }}>
              <Upload />
            </IconButton>
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => Array.from(e.target.files).forEach((f) => uploadMutation.mutate(f))}
          />
          <Tooltip title="New folder">
            <IconButton onClick={() => { setCreateIsDir(true); setCreateDialogOpen(true); }} sx={{ color: 'grey.400' }}>
              <CreateNewFolder />
            </IconButton>
          </Tooltip>
          <Tooltip title="New file">
            <IconButton onClick={() => { setCreateIsDir(false); setCreateDialogOpen(true); }} sx={{ color: 'grey.400' }}>
              <InsertDriveFile />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={() => refetch()} sx={{ color: 'grey.400' }}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Breadcrumbs */}
      <Paper sx={{ p: 1.5, mb: 2, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={() => navigate('/')} sx={{ color: 'grey.400' }}>
            <Home fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={navigateUp} disabled={currentPath === '/'} sx={{ color: 'grey.400' }}>
            <ArrowUpward fontSize="small" />
          </IconButton>
          <Breadcrumbs sx={{ '& .MuiBreadcrumbs-separator': { color: 'grey.600' } }}>
            {breadcrumbs.map((crumb, i) => (
              i < breadcrumbs.length - 1 ? (
                <Link key={crumb.path} component="button" variant="body2" color="primary"
                  onClick={() => navigate(crumb.path)} sx={{ cursor: 'pointer' }}>
                  {crumb.label}
                </Link>
              ) : (
                <Typography key={crumb.path} variant="body2" color="grey.200">
                  {crumb.label}
                </Typography>
              )
            ))}
          </Breadcrumbs>
        </Box>
      </Paper>

      {/* Drop zone / file list */}
      <Paper
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        sx={{
          flex: 1,
          overflow: 'auto',
          background: dragging ? 'rgba(33,150,243,0.08)' : 'rgba(255,255,255,0.03)',
          border: dragging ? '2px dashed #2196f3' : '1px solid rgba(255,255,255,0.08)',
          borderRadius: 2,
          transition: 'all 0.2s',
        }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>
            Failed to load directory: {error.response?.data?.detail || error.message}
          </Alert>
        ) : items.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 6, color: 'grey.600' }}>
            <Folder sx={{ fontSize: 64, mb: 1 }} />
            <Typography>Empty directory — drop files here to upload</Typography>
          </Box>
        ) : (
          <List dense>
            {items.map((item, idx) => (
              <React.Fragment key={item.path}>
                {idx > 0 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.04)' }} />}
                <ListItem
                  button
                  selected={selected?.path === item.path}
                  onClick={() => item.is_directory ? navigate(item.path) : setSelected(item)}
                  sx={{
                    '&.Mui-selected': { background: 'rgba(33,150,243,0.15)' },
                    '&:hover': { background: 'rgba(255,255,255,0.04)' },
                    cursor: item.is_directory ? 'pointer' : 'default',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {item.is_directory
                      ? <Folder sx={{ color: '#ffd54f' }} />
                      : <InsertDriveFile sx={{ color: 'grey.500' }} />}
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography variant="body2" color="grey.200">{item.name}</Typography>}
                    secondary={
                      <Typography variant="caption" color="grey.600">
                        {!item.is_directory && formatSize(item.size)}
                        {item.modified && ` · ${formatDate(item.modified)}`}
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {!item.is_directory && (
                        <Tooltip title="Download">
                          <IconButton size="small" onClick={() => handleDownload(item)} sx={{ color: 'grey.500' }}>
                            <Download fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => { setDeleteTarget(item); setDeleteDialogOpen(true); }} sx={{ color: 'grey.500' }}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
        {dragging && (
          <Box sx={{ textAlign: 'center', p: 2, color: 'primary.main' }}>
            <Typography variant="h6">Drop files here to upload</Typography>
          </Box>
        )}
      </Paper>

      {uploadMutation.isPending && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="caption" color="grey.400">Uploading…</Typography>
        </Box>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => { setCreateDialogOpen(false); setNewName(''); }} PaperProps={{ sx: { background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' } }}>
        <DialogTitle sx={{ color: 'white' }}>Create {createIsDir ? 'Folder' : 'File'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth label="Name" value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') createMutation.mutate({ path: `${currentPath.replace(/\/$/, '')}/${newName}`, isDir: createIsDir }); }}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' } }, '& .MuiInputLabel-root': { color: 'grey.400' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateDialogOpen(false); setNewName(''); }} sx={{ color: 'grey.400' }}>Cancel</Button>
          <Button variant="contained" onClick={() => createMutation.mutate({ path: `${currentPath.replace(/\/$/, '')}/${newName}`, isDir: createIsDir })} disabled={!newName.trim() || createMutation.isPending}>
            {createMutation.isPending ? <CircularProgress size={18} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} PaperProps={{ sx: { background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)' } }}>
        <DialogTitle sx={{ color: 'white' }}>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography color="grey.300">
            Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: 'grey.400' }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => deleteMutation.mutate(deleteTarget?.path)} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? <CircularProgress size={18} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
