import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Skeleton,
  Alert, IconButton, Tooltip, Divider,
} from '@mui/material';
import { Refresh, WifiOff, Wifi } from '@mui/icons-material';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { getSystemInfo } from '../services/api';
import useWebSocket from '../hooks/useWebSocket';

const HISTORY_MAX = 60;

function MetricCard({ title, value, unit, color, subtitle }) {
  return (
    <Card sx={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <CardContent>
        <Typography variant="body2" color="grey.400" gutterBottom>
          {title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
          <Typography variant="h3" fontWeight={700} sx={{ color }}>
            {value ?? '—'}
          </Typography>
          <Typography variant="body1" color="grey.500">
            {unit}
          </Typography>
        </Box>
        {subtitle && (
          <Typography variant="caption" color="grey.500" mt={0.5} display="block">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, data, dataKeys, colors, unit }) {
  return (
    <Card sx={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} color="white" gutterBottom>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              {dataKeys.map((key, i) => (
                <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[i]} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={colors[i]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" tick={{ fill: '#666', fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fill: '#666', fontSize: 10 }} unit={unit} />
            <ReTooltip
              contentStyle={{ background: '#1a1f3a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
              labelStyle={{ color: '#aaa' }}
              itemStyle={{ color: '#fff' }}
            />
            {dataKeys.map((key, i) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[i]}
                fill={`url(#grad-${key})`}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
      <Typography variant="body2" color="grey.500">{label}</Typography>
      <Typography variant="body2" color="grey.200" fontFamily="monospace">{value ?? '—'}</Typography>
    </Box>
  );
}

export default function Dashboard() {
  const [cpuHistory, setCpuHistory] = useState([]);
  const [memHistory, setMemHistory] = useState([]);
  const { metrics, connected, error: wsError } = useWebSocket();

  const { data: sysInfo, isLoading: sysLoading, refetch } = useQuery({
    queryKey: ['systemInfo'],
    queryFn: () => getSystemInfo().then((r) => r.data),
    refetchInterval: 30000,
  });

  const formatTime = () => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!metrics) return;
    const t = formatTime();
    setCpuHistory((prev) => {
      const next = [...prev, { time: t, cpu: metrics.cpu ?? 0 }];
      return next.slice(-HISTORY_MAX);
    });
    setMemHistory((prev) => {
      const next = [...prev, { time: t, memory: metrics.memory?.percent ?? 0 }];
      return next.slice(-HISTORY_MAX);
    });
  }, [metrics]);

  const cpu = metrics?.cpu;
  const mem = metrics?.memory;
  const disk = metrics?.disk;
  const net = metrics?.network;

  const cpuColor = cpu > 80 ? '#f44336' : cpu > 50 ? '#ff9800' : '#4caf50';
  const memColor = mem?.percent > 80 ? '#f44336' : mem?.percent > 50 ? '#ff9800' : '#2196f3';

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="white">
          Dashboard
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={connected ? <Wifi fontSize="small" /> : <WifiOff fontSize="small" />}
            label={connected ? 'Live' : 'Disconnected'}
            size="small"
            color={connected ? 'success' : 'error'}
            variant="outlined"
          />
          <Tooltip title="Refresh system info">
            <IconButton size="small" onClick={() => refetch()} sx={{ color: 'grey.400' }}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {wsError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {wsError} — metrics may be stale.
        </Alert>
      )}

      {/* Metric Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <MetricCard
            title="CPU Usage"
            value={cpu != null ? cpu.toFixed(1) : null}
            unit="%"
            color={cpuColor}
            subtitle={`${metrics?.cpu_count ?? '—'} cores`}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard
            title="Memory"
            value={mem?.percent != null ? mem.percent.toFixed(1) : null}
            unit="%"
            color={memColor}
            subtitle={mem ? `${(mem.used / 1073741824).toFixed(1)} / ${(mem.total / 1073741824).toFixed(1)} GB` : null}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard
            title="Disk Usage"
            value={disk?.percent != null ? disk.percent.toFixed(1) : null}
            unit="%"
            color={disk?.percent > 85 ? '#f44336' : '#9c27b0'}
            subtitle={disk ? `${(disk.used / 1073741824).toFixed(1)} / ${(disk.total / 1073741824).toFixed(1)} GB` : null}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard
            title="Network ↑↓"
            value={net ? `${(net.bytes_sent / 1048576).toFixed(1)}` : null}
            unit="MB/s"
            color="#00bcd4"
            subtitle={net ? `↓ ${(net.bytes_recv / 1048576).toFixed(1)} MB/s` : null}
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <ChartCard
            title="CPU History"
            data={cpuHistory}
            dataKeys={['cpu']}
            colors={['#4caf50']}
            unit="%"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartCard
            title="Memory History"
            data={memHistory}
            dataKeys={['memory']}
            colors={['#2196f3']}
            unit="%"
          />
        </Grid>
      </Grid>

      {/* System Info */}
      <Card sx={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} color="white" gutterBottom>
            System Information
          </Typography>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 1 }} />
          {sysLoading ? (
            [1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={32} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />)
          ) : (
            <Grid container spacing={0}>
              <Grid item xs={12} sm={6}>
                <InfoRow label="OS" value={sysInfo?.os} />
                <InfoRow label="Hostname" value={sysInfo?.hostname} />
                <InfoRow label="Kernel" value={sysInfo?.kernel} />
                <InfoRow label="Architecture" value={sysInfo?.arch} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <InfoRow label="CPU Model" value={sysInfo?.cpu_model} />
                <InfoRow label="CPU Cores" value={sysInfo?.cpu_count} />
                <InfoRow label="Uptime" value={sysInfo?.uptime} />
                <InfoRow label="Python" value={sysInfo?.python_version} />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
