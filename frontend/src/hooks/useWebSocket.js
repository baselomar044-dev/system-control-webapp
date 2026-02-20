import { useEffect, useRef, useState, useCallback } from 'react';
import { getToken } from '../utils/auth';

const WS_URL = 'ws://localhost:8000/ws/metrics';
const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export default function useWebSocket() {
  const [metrics, setMetrics] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const attemptsRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    const token = getToken();
    const url = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setConnected(true);
        setError(null);
        attemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          setMetrics(data);
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setError('WebSocket connection error');
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        if (attemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          attemptsRef.current += 1;
          reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
        } else {
          setError('Unable to connect to metrics server');
        }
      };
    } catch (err) {
      setError('Failed to create WebSocket connection');
    }
  }, []);

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimerRef.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { metrics, connected, error, disconnect, reconnect: connect };
}
