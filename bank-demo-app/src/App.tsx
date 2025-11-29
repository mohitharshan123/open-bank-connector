import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { toast } from 'react-toastify'
import './App.css'
import { ConnectButton } from './components/ConnectButton'
import { ProviderDetailPage } from './components/ProviderDetailPage'
import { COMPANIES, type CompanyId } from './constants/companies'
import { useAuthenticate } from './hooks/useBankQueries'

const HomePage = () => {
  const [selectedCompany, setSelectedCompany] = useState<CompanyId>(COMPANIES[0].id)
  const authenticate = useAuthenticate()

  const handleOAuthCallback = () => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (code) {
      authenticate.mutate(
        { provider: 'airwallex', companyId: selectedCompany, oauthCode: code },
        {
          onSuccess: () => {
            toast.success('Successfully authenticated with Airwallex!')
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
  }

  useEffect(() => {
    handleOAuthCallback()
  }, [selectedCompany])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Banking Demo App</h1>
          <p className="text-gray-600">Connect to banking providers (Airwallex & Basiq supported)</p>
        </header>

        <div className="mb-6">
          <div className="flex gap-4 items-center mb-6">
            <label className="text-sm font-medium text-gray-700">Select Company:</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value as CompanyId)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {COMPANIES.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">Connect Providers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Airwallex</h3>
                <p className="text-sm text-gray-600 mb-4">Connect your Airwallex account</p>
                <ConnectButton provider="airwallex" companyId={selectedCompany} />
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Basiq</h3>
                <p className="text-sm text-gray-600 mb-4">Connect your Basiq account</p>
                <ConnectButton provider="basiq" companyId={selectedCompany} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/provider/:provider/:companyId" element={<ProviderDetailPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
