import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { usePushWalletContext, usePushChainClient, PushUI } from '@pushchain/ui-kit';

export default function ProtectedRoute({ children }) {
  const { connectionStatus, handleUserLogOutEvent } = usePushWalletContext();
  const { isInitialized } = usePushChainClient();
  const navigate = useNavigate();
  const [initTimedOut, setInitTimedOut] = useState(false);

  // Safety net: if the provider never reports isInitialized=true (bad config,
  // SDK startup failure, offline), show a helpful message after 10s instead
  // of rendering `null` forever (which manifests as a black page).
  useEffect(() => {
    if (isInitialized) return;
    const t = setTimeout(() => setInitTimedOut(true), 10_000);
    return () => clearTimeout(t);
  }, [isInitialized]);

  // Track and handle connection status
  useEffect(() => {
    const wasConnected = localStorage.getItem('wasConnected') === 'true';

    if (connectionStatus === PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED) {
      localStorage.setItem('wasConnected', 'true');
    } else if (connectionStatus === PushUI.CONSTANTS.CONNECTION.STATUS.NOT_CONNECTED && wasConnected && isInitialized) {
      // Wallet was disconnected after being connected, log out user
      // Only trigger this after initialization to avoid false disconnects on page load
      // Clear navigation flags
      localStorage.removeItem('navigateToDashboardAfterConnect');
      localStorage.removeItem('wasConnected');
      
      if (handleUserLogOutEvent) {
        handleUserLogOutEvent();
      }
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
    // If the provider hasn't initialized after 10s, something is wrong —
    // show a recovery screen instead of a black page.
    if (initTimedOut) {
      return (
        <div className="min-h-screen bg-black text-white font-dm flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-[16px] border border-[#F4AEFF]/40 bg-[#111111] p-6 flex flex-col gap-4">
            <h2 className="text-[20px] font-bold">Wallet didn't initialize</h2>
            <p className="text-[13px] text-[#AAA] leading-relaxed">
              The Push Wallet provider is taking unusually long to start. This usually clears with a reload.
              If it persists, disconnect and reconnect from the homepage.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-full bg-[#D548EC] hover:bg-[#B83CC3] text-white text-[13px] font-semibold"
              >
                Reload
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('wasConnected');
                  localStorage.removeItem('navigateToDashboardAfterConnect');
                  navigate('/', { replace: true });
                }}
                className="px-5 py-2.5 rounded-full border border-[#333] hover:border-[#F4AEFF]/60 text-[#AAA] text-[13px]"
              >
                Back to home
              </button>
            </div>
          </div>
        </div>
      );
    }
    // Brief loading state while wallet reconnects.
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#AAA] font-dm">
          <span className="w-3 h-3 rounded-full bg-[#D548EC] animate-pulse" />
          Connecting to Push Wallet…
        </div>
      </div>
    );
  }

  // After initialization, only allow access if user is connected or was previously connected
  if (!wasConnected && !isCurrentlyConnected) {
    return <Navigate to="/" replace />;
  }

  return children;
}
