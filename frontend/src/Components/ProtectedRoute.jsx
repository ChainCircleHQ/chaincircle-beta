import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { usePushWalletContext, usePushChainClient, PushUI } from '@pushchain/ui-kit';

export default function ProtectedRoute({ children }) {
  const { connectionStatus, handleUserLogOutEvent } = usePushWalletContext();
  const { isInitialized } = usePushChainClient();
  const navigate = useNavigate();

  // Track and handle connection status
  useEffect(() => {
    const wasConnected = localStorage.getItem('wasConnected') === 'true';

    if (connectionStatus === PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED) {
      localStorage.setItem('wasConnected', 'true');
    } else if (connectionStatus === PushUI.CONSTANTS.CONNECTION.STATUS.NOT_CONNECTED && wasConnected && isInitialized) {
      // Wallet was disconnected after being connected, log out user
      // Only trigger this after initialization to avoid false disconnects on page load
      if (handleUserLogOutEvent) {
        handleUserLogOutEvent();
      }
      localStorage.removeItem('wasConnected');
      navigate('/', { replace: true });
    }
  }, [connectionStatus, handleUserLogOutEvent, navigate, isInitialized]);

  // Check if user was ever connected (from localStorage)
  const wasConnected = localStorage.getItem('wasConnected') === 'true';
  const isCurrentlyConnected = connectionStatus === PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED;

  // If wallet is not initialized yet
  if (!isInitialized) {
    // If user was never connected, redirect immediately (no loading screen)
    if (!wasConnected) {
      return <Navigate to="/" replace />;
    }
    // If user was connected before, show brief loading while wallet reconnects
    return null;
  }

  // After initialization, only allow access if user is connected or was previously connected
  if (!wasConnected && !isCurrentlyConnected) {
    return <Navigate to="/" replace />;
  }

  return children;
}
