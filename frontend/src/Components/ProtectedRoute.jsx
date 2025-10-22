import React from 'react';
import { Navigate } from 'react-router';
import { usePushWalletContext, PushUI } from '@pushchain/ui-kit';

export default function ProtectedRoute({ children }) {
  const { connectionStatus } = usePushWalletContext();

  if (connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED) {
    return <Navigate to="/" replace />;
  }

  return children;
}
