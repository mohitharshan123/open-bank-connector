import { useNavigate, useParams } from 'react-router-dom';
import type { ProviderType } from '../api/bankApi';
import { useAccount, useBalances, useConnectionStatus } from '../hooks/useBankQueries';
import { AccountDetails } from './AccountDetails';
import { TransactionsList } from './TransactionsList';

export const ProviderDetailPage = () => {
    const { provider, companyId } = useParams<{ provider: ProviderType; companyId: string }>();
    const navigate = useNavigate();

    if (!provider || !companyId) {
        return <div>Invalid provider or company</div>;
    }

    const { data: connectionStatus, isLoading: statusLoading } = useConnectionStatus(provider, companyId);
    const { data: accounts, isLoading: accountsLoading } = useAccount(provider, companyId, connectionStatus?.isConnected);
    const { isLoading: balancesLoading } = useBalances(provider, companyId, connectionStatus?.isConnected);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <button
                    onClick={() => navigate('/')}
                    className="mb-4 text-blue-600 hover:text-blue-800"
                >
                    ← Back to Home
                </button>

                <header className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        {provider === 'airwallex' ? 'Airwallex' : 'Fiskil'} Details
                    </h1>
                    <p className="text-gray-600">Company: {companyId}</p>
                    {statusLoading ? (
                        <p className="text-sm text-gray-500">Checking connection status...</p>
                    ) : (
                        <div className="mt-2">
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${connectionStatus?.isConnected
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                                }`}>
                                {connectionStatus?.isConnected ? '✓ Connected' : '✗ Not Connected'}
                            </span>
                        </div>
                    )}
                </header>

                {!connectionStatus?.isConnected ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                        <p className="text-yellow-800">
                            This provider is not connected. Please connect it from the home page.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        {accountsLoading || balancesLoading ? (
                            <div className="text-center py-8">Loading data...</div>
                        ) : (
                            <>
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold mb-4">Accounts ({accounts?.length || 0})</h2>
                                    {accounts && accounts.length > 0 ? (
                                        <div className="space-y-4">
                                            {accounts.map((account) => (
                                                <div
                                                    key={account.id}
                                                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h3 className="font-semibold text-lg">{account.accountName || 'Unnamed Account'}</h3>
                                                            <p className="text-sm text-gray-600">Account: {account.accountNumber}</p>
                                                            <p className="text-sm text-gray-500">Type: {account.type || 'N/A'}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xl font-bold">
                                                                {account.currency || ''} {typeof account.balance === 'number' ? account.balance.toFixed(2) : (account.balance ? String(account.balance) : '0.00')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            No accounts found.
                                        </div>
                                    )}
                                </div>

                                <AccountDetails provider={provider} companyId={companyId} />

                                <TransactionsList
                                    provider={provider}
                                    companyId={companyId}
                                />
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

