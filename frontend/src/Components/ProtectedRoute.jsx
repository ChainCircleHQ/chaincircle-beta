import React, { useEffect } from 'react';
import { Navigate } from 'react-router';
import { usePushWalletContext, PushUI } from '@pushchain/ui-kit';

export default function ProtectedRoute({ children }) {
  const { connectionStatus } = usePushWalletContext();

  // Track connection status in localStorage for persistence
  useEffect(() => {
    if (connectionStatus === PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED) {
      localStorage.setItem('wasConnected', 'true');
    } else if (connectionStatus === PushUI.CONSTANTS.CONNECTION.STATUS.NOT_CONNECTED) {
      // Only clear on explicit disconnect (logout)
      localStorage.removeItem('wasConnected');
    }
  }, [connectionStatus]);

  // Check if user was ever connected (from localStorage)
  const wasConnected = localStorage.getItem('wasConnected') === 'true';
  const isCurrentlyConnected = connectionStatus === PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED;

  // Only redirect if user was never connected AND is not currently connected
  // This allows users to stay on 404 pages while logged in
  if (!wasConnected && !isCurrentlyConnected) {
    return <Navigate to="/" replace />;
  }

  return children;
}
