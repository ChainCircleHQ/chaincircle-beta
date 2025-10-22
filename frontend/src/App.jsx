import React from 'react'
import { Route, Routes } from 'react-router'
import { BrowserRouter } from 'react-router'
import Layout from './Layout'
import Home from './Routes/Home'
import Profile from './Routes/Profile'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Dashboard from './Routes/Dashboard'
import Circle from './Routes/Circle'
import Payout from './Routes/Payout'
import Dashboard404 from './Pages/Dashboard404'
import General404 from './Pages/General404'
import { PushUniversalWalletProvider, PushUI } from '@pushchain/ui-kit'
import ProtectedRoute from './Components/ProtectedRoute'

function App() {
  const queryClient = new QueryClient();
  
  const walletConfig = {
    network: PushUI.CONSTANTS.PUSH_NETWORK.TESTNET,
    login: {
      email: true,
      google: true,
      wallet: {
        enabled: true,
      },
      appPreview: true,
    },
    modal: {
      loginLayout: PushUI.CONSTANTS.LOGIN.LAYOUT.SPLIT,
      connectedLayout: PushUI.CONSTANTS.CONNECTED.LAYOUT.HOVER,
      appPreview: true,
    },
  };

  const appMetadata = {
  logoUrl: '/assets/logo.png', // This controls the wallet modal logo
  title: 'ChainCircle',
  description: 'Chaincircle is a Decentralized savings platform for EVERY user on ANY blockchain WITHOUT bridging',
};

  return (
    <QueryClientProvider client={queryClient}>
      <PushUniversalWalletProvider 
        config={walletConfig}
        app={appMetadata}
        themeMode={PushUI.CONSTANTS.THEME.DARK}
      >
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/chain" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="circle" element={<Circle />} />
              <Route path="payout" element={<Payout />} />
              {/* Dashboard 404 - for when user is on dashboard and requests invalid page */}
              <Route path="*" element={<Dashboard404 />} />
            </Route>
            {/* General 404 - for when user is not on dashboard */}
            <Route path="*" element={<General404 />} />
          </Routes>
        </BrowserRouter>
      </PushUniversalWalletProvider>
    </QueryClientProvider>
  );
}
export default App