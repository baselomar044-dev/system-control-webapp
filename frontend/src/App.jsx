import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Typography, Avatar, Divider, IconButton,
  Tooltip, createTheme, ThemeProvider, CssBaseline, AppBar,
  Toolbar, useMediaQuery, Chip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon, FolderOpen, Memory, Terminal as TerminalIcon,
  PowerSettingsNew, Apps, Screenshot, SmartToy, Logout, Menu,
  Computer, ChevronLeft,
} from '@mui/icons-material';

import { isAuthenticated, logout, getUser } from './utils/auth';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import FileManager from './components/FileManager';
import ProcessManager from './components/ProcessManager';
import Terminal from './components/Terminal';
import PowerControls from './components/PowerControls';
import AppLauncher from './components/AppLauncher';
import ScreenViewer from './components/ScreenViewer';
import AgentChat from './components/AgentChat';

const DRAWER_WIDTH = 220;
const DRAWER_COLLAPSED = 64;

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#2196f3' },
    secondary: { main: '#9c27b0' },
    background: {
      default: '#0a0e1a',
      paper: '#111827',
    },
  },
  typography: {
    fontFamily: "'Roboto', sans-serif",
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: '#0a0e1a',
          scrollbarWidth: 'thin',
          scrollbarColor: '#333 transparent',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: '#333', borderRadius: 3 },
        },
      },
    },
  },
});

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/files', label: 'Files', icon: <FolderOpen /> },
  { path: '/processes', label: 'Processes', icon: <Memory /> },
  { path: '/terminal', label: 'Terminal', icon: <TerminalIcon /> },
  { path: '/power', label: 'Power', icon: <PowerSettingsNew /> },
  { path: '/apps', label: 'Apps', icon: <Apps /> },
  { path: '/screen', label: 'Screen', icon: <Screenshot /> },
  { path: '/agent', label: 'AI Agent', icon: <SmartToy /> },
];

function Sidebar({ collapsed, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [navigate]);

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: collapsed ? 1 : 2,
          py: 1.5,
          gap: 1.5,
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: 56,
        }}
      >
        {!collapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Computer sx={{ color: 'primary.main', fontSize: 22 }} />
            <Typography variant="subtitle1" fontWeight={700} color="white" noWrap>
              SysControl
            </Typography>
          </Box>
        )}
        <IconButton size="small" onClick={onToggle} sx={{ color: 'grey.400' }}>
          {collapsed ? <Menu /> : <ChevronLeft />}
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      {/* Nav items */}
      <List sx={{ flex: 1, py: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Tooltip key={item.path} title={collapsed ? item.label : ''} placement="right">
              <ListItem disablePadding sx={{ mb: 0.25 }}>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  selected={active}
                  sx={{
                    mx: 1,
                    borderRadius: 2,
                    px: collapsed ? 1 : 1.5,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    '&.Mui-selected': {
                      background: 'rgba(33,150,243,0.18)',
                      '&:hover': { background: 'rgba(33,150,243,0.24)' },
                    },
                    '&:hover': { background: 'rgba(255,255,255,0.06)' },
                    minHeight: 44,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: collapsed ? 'auto' : 36,
                      color: active ? 'primary.main' : 'grey.500',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: active ? 600 : 400,
                        color: active ? 'white' : 'grey.400',
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            </Tooltip>
          );
        })}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      {/* User / Logout */}
      <Box sx={{ p: collapsed ? 1 : 1.5, display: 'flex', alignItems: 'center', gap: 1, justifyContent: collapsed ? 'center' : 'space-between' }}>
        {!collapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: '0.8rem' }}>
              {(user?.username || 'U')[0].toUpperCase()}
            </Avatar>
            <Typography variant="caption" color="grey.400" noWrap>
              {user?.username || 'User'}
            </Typography>
          </Box>
        )}
        <Tooltip title="Logout">
          <IconButton size="small" onClick={handleLogout} sx={{ color: 'grey.500', '&:hover': { color: '#f44336' } }}>
            <Logout fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH,
        flexShrink: 0,
        transition: 'width 0.2s',
        '& .MuiDrawer-paper': {
          width: collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH,
          boxSizing: 'border-box',
          background: '#111827',
          border: 'none',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          overflowX: 'hidden',
          transition: 'width 0.2s',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}

function ProtectedLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Box sx={{ display: 'flex', height: '100vh', background: '#0a0e1a' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <Box
        component="main"
        sx={{
          flex: 1,
          overflow: 'auto',
          minHeight: '100vh',
        }}
      >
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/files" element={<FileManager />} />
          <Route path="/processes" element={<ProcessManager />} />
          <Route path="/terminal" element={<Terminal />} />
          <Route path="/power" element={<PowerControls />} />
          <Route path="/apps" element={<AppLauncher />} />
          <Route path="/screen" element={<ScreenViewer />} />
          <Route path="/agent" element={<AgentChat />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Box>
    </Box>
  );
}

function RequireAuth({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated());

  const handleLoginSuccess = () => setAuthed(true);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              authed ? <Navigate to="/dashboard" replace /> : <Login onSuccess={handleLoginSuccess} />
            }
          />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <ProtectedLayout />
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
