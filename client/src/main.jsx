import { createRoot } from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <PrivyProvider
    appId={import.meta.env.VITE_PRIVY_APP_ID}
    config={{
      loginMethods: ['email', 'wallet', 'google'],
      appearance: {
        theme: 'dark',
        accentColor: '#FFD700',
        logo: '/logo.jpg'
      },
      embeddedWallets: {
        createOnLogin: 'users-without-wallets'
      }
    }}
  >
    <App />
  </PrivyProvider>
)
