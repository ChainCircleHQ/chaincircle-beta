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
import Notification from './Routes/Notification'
import FAQ from './Pages/Landing/FAQ'
import Terms from './Pages/Landing/Terms'
import About from './Pages/Landing/About'
import Faucet from './Pages/Landing/Faucet'
import Dashboard404 from './Pages/Dashboard404'
import General404 from './Pages/General404'
import { PushUniversalWalletProvider, PushUI } from '@pushchain/ui-kit'
import ProtectedRoute from './Components/ProtectedRoute'
import { Analytics } from "@vercel/analytics/react"

function App() {
  const queryClient = new QueryClient();
  const [walletTheme, setWalletTheme] = React.useState(() => {
    const theme = localStorage.getItem('theme') || 'dark';
    // Convert 'system' to 'dark' if found
    const actualTheme = theme === 'system' ? 'dark' : theme;
    return actualTheme === 'dark' ? PushUI.CONSTANTS.THEME.DARK : PushUI.CONSTANTS.THEME.LIGHT;
  });


  // Listen for theme changes
  React.useEffect(() => {
    const updateWalletTheme = () => {
      const theme = localStorage.getItem('theme') || 'dark';

      // Convert 'system' to 'dark' if found
      const currentTheme = theme === 'system' ? 'dark' : theme;

      const newWalletTheme = currentTheme === 'dark'
        ? PushUI.CONSTANTS.THEME.DARK
        : PushUI.CONSTANTS.THEME.LIGHT;

      setWalletTheme(newWalletTheme);
    };

    // Check for theme changes via storage event (cross-tab sync)
    window.addEventListener('storage', updateWalletTheme);

    // Check for theme changes via custom event (same tab)
    const handleThemeChange = () => updateWalletTheme();
    window.addEventListener('themeChange', handleThemeChange);

    // Initial check
    updateWalletTheme();

    return () => {
      window.removeEventListener('storage', updateWalletTheme);
      window.removeEventListener('themeChange', handleThemeChange);
    };
  }, []);

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
              {/* Dashboard 404 - for when user is on dashboard and requests invalid page */}
              <Route path="*" element={<Dashboard404 />} />
            </Route>
            {/* General 404 - for when user is not on dashboard */}
            <Route path="*" element={<General404 />} />
          </Routes>
          <Analytics />
        </BrowserRouter>
      </PushUniversalWalletProvider>
    </QueryClientProvider>
  );
}
export default App