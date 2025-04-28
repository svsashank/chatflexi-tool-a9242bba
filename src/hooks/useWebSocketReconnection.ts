
import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UseWebSocketReconnectionOptions {
  channelName: string;
  eventName: string;
  schema?: string;
  table?: string;
  filter?: string;
  onEvent?: (payload: any) => void;
  maxRetries?: number;
  retryDelay?: number;
  debug?: boolean;
}

export const useWebSocketReconnection = ({
  channelName,
  eventName,
  schema = 'public',
  table,
  filter,
  onEvent,
  maxRetries = 5,
  retryDelay = 2000,
  debug = false
}: UseWebSocketReconnectionOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retriesRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper for logging if debug mode is on
  const log = (...args: any[]) => {
    if (debug) console.log(`[WebSocket:${channelName}]`, ...args);
  };

  // Setup connection with retry logic
  const setupConnection = () => {
    if (channelRef.current) {
      log('Removing existing channel before reconnect');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    try {
      setIsConnecting(true);
      setConnectionError(null);
      log('Setting up WebSocket connection');
      
      const channel = supabase.channel(channelName);
      
      // Subscribe to postgres changes if table provided
      if (table) {
        // Fix the type mismatch by using proper types for Supabase Realtime
        const channelConfig = {
          event: eventName,
          schema,
          table,
          filter
        } as any; // Using 'as any' to bypass type checking for now
        
        channel.on(
          'postgres_changes',
          channelConfig,
          (payload) => {
            log('Received event:', eventName, 'for table:', table);
            if (onEvent) onEvent(payload);
          }
        );
      }
      
      // Handle connection status changes
      channel
        .on('system', { event: 'connected' }, () => {
          log('Connected successfully');
          setIsConnected(true);
          setIsConnecting(false);
          setConnectionError(null);
          retriesRef.current = 0; // Reset retry counter on success
        })
        .on('system', { event: 'disconnected' }, () => {
          log('Disconnected');
          setIsConnected(false);
          if (retriesRef.current < maxRetries) {
            retryConnection();
          }
        })
        .on('system', { event: 'error' }, (err) => {
          log('Connection error:', err);
          setConnectionError(err.message || 'WebSocket connection error');
          setIsConnected(false);
          if (retriesRef.current < maxRetries) {
            retryConnection();
          }
        });
      
      // Subscribe to the channel
      channel.subscribe((status) => {
        log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setIsConnecting(false);
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionError('Channel error');
          setIsConnected(false);
          setIsConnecting(false);
        }
      });
      
      channelRef.current = channel;
    } catch (error: any) {
      log('Setup error:', error);
      setConnectionError(error?.message || 'Error setting up WebSocket');
      setIsConnecting(false);
      if (retriesRef.current < maxRetries) {
        retryConnection();
      }
    }
  };

  // Handle retry logic
  const retryConnection = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
    }
    
    retriesRef.current += 1;
    const delay = retryDelay * Math.pow(1.5, retriesRef.current - 1); // Exponential backoff
    
    log(`Retry ${retriesRef.current}/${maxRetries} in ${delay}ms`);
    
    retryTimerRef.current = setTimeout(() => {
      log(`Attempting reconnect #${retriesRef.current}`);
      setupConnection();
    }, delay);
  };

  // Initial setup and cleanup
  useEffect(() => {
    setupConnection();
    
    return () => {
      log('Cleaning up WebSocket connection');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [channelName, eventName, schema, table]); // Re-subscribe if these props change

  // Manually reconnect
  const reconnect = () => {
    log('Manual reconnection requested');
    retriesRef.current = 0; // Reset retry counter
    setupConnection();
  };

  return {
    isConnected,
    isConnecting,
    connectionError,
    reconnect
  };
};
