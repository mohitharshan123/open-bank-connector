import { useEffect, useState } from 'react'
import './App.css'
import { AccountsList } from './components/AccountsList'
import { AuthenticateButton } from './components/AuthenticateButton'
import { PROVIDER_TYPES } from './constants'
import { useAuthenticate } from './hooks/useBankQueries'
import { toast } from 'react-toastify'

const App = () => {
  const [selectedProvider, setSelectedProvider] = useState<PROVIDER_TYPES>(PROVIDER_TYPES.airwallex)
  const authenticate = useAuthenticate()

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (code) {
      // Airwallex OAuth callback - exchange code for token
      authenticate.mutate(
        { provider: 'airwallex', oauthCode: code },
        {
          onSuccess: () => {
            toast.success('Successfully authenticated with Airwallex!')
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname)
          },
          onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Failed to authenticate')
            window.history.replaceState({}, document.title, window.location.pathname)
          },
        }
      )
    } else if (error) {
      toast.error(`OAuth error: ${error}`)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [authenticate])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Banking Demo App</h1>
          <p className="text-gray-600">Connect to banking providers (Airwallex & Basiq supported)</p>
        </header>

        <div className="mb-6">
          <div className="flex gap-4 items-center mb-4">
            <label className="text-sm font-medium text-gray-700">Select Provider:</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as PROVIDER_TYPES)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="airwallex">Airwallex</option>
              <option value="basiq">Basiq</option>
            </select>
            <AuthenticateButton provider={selectedProvider} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <AccountsList provider={selectedProvider} />
        </div>
      </div>
    </div>
  )
}

export default App
