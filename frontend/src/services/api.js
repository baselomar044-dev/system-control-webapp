import axios from 'axios';
import { getToken, removeToken } from '../utils/auth';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      removeToken();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authLogin = (username, password) =>
  api.post('/api/auth/login', { username, password });

export const authLogout = () => api.post('/api/auth/logout');

export const getMe = () => api.get('/api/auth/me');

// System
export const getSystemInfo = () => api.get('/api/system/info');

export const getCpuHistory = (minutes = 5) =>
  api.get(`/api/system/cpu-history?minutes=${minutes}`);

// Files
export const listFiles = (path = '/') =>
  api.get('/api/files', { params: { path } });

export const createFile = (path, isDirectory = false, content = '') =>
  api.post('/api/files', { path, is_directory: isDirectory, content });

export const deleteFile = (path) =>
  api.delete('/api/files', { data: { path } });

export const renameFile = (oldPath, newPath) =>
  api.put('/api/files/rename', { old_path: oldPath, new_path: newPath });

export const uploadFile = (directory, file, onProgress) => {
  const form = new FormData();
  form.append('file', file);
  form.append('directory', directory);
  return api.post('/api/files/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  });
};

export const downloadFile = (path) =>
  api.get('/api/files/download', {
    params: { path },
    responseType: 'blob',
  });

// Processes
export const listProcesses = () => api.get('/api/processes');

export const killProcess = (pid, signal = 'SIGTERM') =>
  api.delete(`/api/processes/${pid}`, { data: { signal } });

// Commands
export const executeCommand = (command, cwd = null, timeout = 30) =>
  api.post('/api/commands/execute', { command, cwd, timeout });

export const getCommandHistory = (limit = 50) =>
  api.get(`/api/commands/history?limit=${limit}`);

// Power
export const shutdown = (delay = 0) =>
  api.post('/api/power/shutdown', { delay });

export const restart = (delay = 0) =>
  api.post('/api/power/restart', { delay });

export const sleep = () => api.post('/api/power/sleep');

export const lockScreen = () => api.post('/api/power/lock');

// Apps
export const listApps = () => api.get('/api/apps');

export const launchApp = (appId, args = []) =>
  api.post('/api/apps/launch', { app_id: appId, args });

// Screenshots
export const takeScreenshot = () => api.post('/api/screenshots/take');

export const getScreenshots = () => api.get('/api/screenshots');

export const deleteScreenshot = (filename) =>
  api.delete(`/api/screenshots/${filename}`);

// Agent
export const sendMessage = (message, sessionId = null) =>
  api.post('/api/agent/chat', { message, session_id: sessionId });

export const getChatHistory = (sessionId = null) =>
  api.get('/api/agent/history', { params: { session_id: sessionId } });

export default api;
