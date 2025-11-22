import type { ProviderType } from '../api/bankApi';
import { useAccount } from '../hooks/useBankQueries';
import { AccountDetails } from './AccountDetails';

interface AccountsListProps {
    provider: ProviderType;
}

export const AccountsList = ({ provider }: AccountsListProps) => {
    const { data: account, isLoading, error, refetch } = useAccount(provider);

    if (isLoading) {
        return <div className="text-center py-8">Loading account...</div>;
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded p-4">
                <p className="text-red-800">Error loading account: {(error as Error).message}</p>
                <button
                    onClick={() => refetch()}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!account) {
        return (
            <div className="text-center py-8 text-gray-500">
                No account found. Please authenticate first.
            </div>
        );
    }

    return (
        <div>
            <div className="mb-4">
                <h2 className="text-2xl font-bold mb-4">Account Details</h2>
                <div
                    className="border rounded-lg p-4 hover:shadow-md cursor-pointer transition-shadow"
                    onClick={() => { }}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-semibold text-lg">{account.accountName}</h3>
                            <p className="text-sm text-gray-600">Account: {account.accountNumber}</p>
                            <p className="text-sm text-gray-500">Type: {account.type}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-bold">
                                {account.currency} {account.balance.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <AccountDetails provider={provider} />
        </div>
    );
};

