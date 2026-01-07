import { createRoot } from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <PrivyProvider
    appId={import.meta.env.VITE_PRIVY_APP_ID}
    config={{
      loginMethods: ['email', 'google', 'wallet'],
      appearance: {
        theme: 'dark',
        accentColor: '#FFD700',
        logo: '/logo.jpg',
        landingHeader: 'Welcome to Chain Ticket',
        loginMessage: 'Sign in with Privy to access your embedded wallet'
      },
      embeddedWallets: {
        createOnLogin: 'all-users', // Changed from 'users-without-wallets' to ensure Google users get wallets
        requireUserPasswordOnCreate: false,
        noPromptOnSignature: false
      },
      // Ensure Google OAuth works correctly
      legal: {
        termsAndConditionsUrl: 'https://chainticket.com/terms',
        privacyPolicyUrl: 'https://chainticket.com/privacy'
      },
      // Support for email and Google
      supportedChains: [
        // Movement Network will be added here when available in Privy
      ]
    }}
  >
    <App />
  </PrivyProvider>
)
