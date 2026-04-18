import React, { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router'
import { BrowserRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PushUniversalWalletProvider, PushUI } from '@pushchain/ui-kit'
import { Analytics } from "@vercel/analytics/react"
import { Toaster } from 'sonner'
import ProtectedRoute from './Components/ProtectedRoute'
import ErrorBoundary from './Components/ErrorBoundary'

// Keep the landing page + Layout shell eager-loaded — they're what every
// first visit renders. Everything else is split into its own chunk via
// React.lazy so the initial bundle doesn't drag 9MB of downstream code.
import Home from './Routes/Home'
import Layout from './Layout'
import General404 from './Pages/General404'
import Dashboard404 from './Pages/Dashboard404'

const Dashboard     = lazy(() => import('./Routes/Dashboard'))
const Profile       = lazy(() => import('./Routes/Profile'))
const Circle        = lazy(() => import('./Routes/Circle'))
const Payout        = lazy(() => import('./Routes/Payout'))
const Notification  = lazy(() => import('./Routes/Notification'))
const Leaderboard   = lazy(() => import('./Routes/Leaderboard'))
const CircleDetail  = lazy(() => import('./Routes/CircleDetail'))
const FAQ           = lazy(() => import('./Pages/Landing/FAQ'))
const Terms         = lazy(() => import('./Pages/Landing/Terms'))
const About         = lazy(() => import('./Pages/Landing/About'))
const Faucet        = lazy(() => import('./Pages/Landing/Faucet'))

function RouteFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <div className="flex items-center gap-3 text-[#AAA] font-dm">
                <span className="w-3 h-3 rounded-full bg-[#D548EC] animate-pulse" />
                Loading…
            </div>
        </div>
    );
}

function App() {
  const queryClient = new QueryClient();
  // Always use dark mode for wallet
  const walletTheme = PushUI.CONSTANTS.THEME.DARK;


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
    logoUrl: 'https://ipfs.io/ipfs/bafkreieh7eiefgyfhjkgmon74kfpun4ivvxgrnrbiymmtbzx3aaqxwujbi', // This controls the wallet modal logo (LHS)
    title: 'ChainCircle',
    description: 'Chaincircle is a Decentralized savings platform for EVERY user on ANY blockchain WITHOUT bridging',
  };

  return (
    <QueryClientProvider client={queryClient}>
      <PushUniversalWalletProvider
        config={walletConfig}
        app={appMetadata}
        themeMode={walletTheme}
      >
        <BrowserRouter>
          <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/about" element={<About />} />
              <Route path="/faucet" element={<Faucet />} />
              <Route path="/chain" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="profile" element={<Profile />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="circle" element={<Circle />} />
                <Route path="payout" element={<Payout />} />
                <Route path="notification" element={<Notification />} />
                <Route path="leaderboard" element={<Leaderboard />} />
                <Route path="circle/:id" element={<CircleDetail />} />
                {/* Dashboard 404 - for when user is on dashboard and requests invalid page */}
                <Route path="*" element={<Dashboard404 />} />
              </Route>
              {/* General 404 - for when user is not on dashboard */}
              <Route path="*" element={<General404 />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
          <Analytics />
          <Toaster
            position="bottom-right"
            theme="dark"
            richColors
            closeButton
            toastOptions={{
              style: {
                background: '#111111',
                border: '1px solid #F4AEFF',
                color: '#fff',
              },
            }}
          />
        </BrowserRouter>
      </PushUniversalWalletProvider>
    </QueryClientProvider>
  );
}
export default App
