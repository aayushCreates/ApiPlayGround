import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  console.warn("Missing Publishable Key: Add VITE_CLERK_PUBLISHABLE_KEY to your .env file to enable Authentication")
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})

// We inject ClerkProvider with a fallback if the key is missing to prevent total crash on dev without env setup
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {PUBLISHABLE_KEY ? (
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ClerkProvider>
    ) : (
      <div className="p-8 text-center text-red-500 font-bold bg-zinc-900 h-screen w-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl mb-4">Auth Configuration Missing</h1>
        <p>Please configure VITE_CLERK_PUBLISHABLE_KEY in frontend/.env</p>
      </div>
    )}
  </StrictMode>,
)
