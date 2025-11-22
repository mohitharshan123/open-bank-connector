import type { ProviderType } from '../api/bankApi';
import { useAccount, useBalances } from '../hooks/useBankQueries';

interface AccountDetailsProps {
    provider: ProviderType;
}

export const AccountDetails = ({ provider }: AccountDetailsProps) => {
    const { data: account, isLoading: accountLoading } = useAccount(provider);
    const { data: balances, isLoading: balancesLoading } = useBalances(provider);

    if (accountLoading || balancesLoading) {
        return (
            <div className="text-center py-8">Loading account details...</div>
        );
    }

    return (
        <div className="mt-6">
            {account && (
                <div className="mb-6">
                    <h3 className="text-xl font-bold mb-4">Account Information</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p className="text-sm text-gray-600">Account Name</p>
                            <p className="font-semibold">{account.accountName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Account Number</p>
                            <p className="font-semibold">{account.accountNumber}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Type</p>
                            <p className="font-semibold">{account.type}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Provider</p>
                            <p className="font-semibold">{account.provider}</p>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <h3 className="text-xl font-bold mb-4">Balances</h3>
                {balances && balances.length > 0 ? (
                    <div className="grid gap-4">
                        {balances.map((balance, index) => (
                            <div
                                key={index}
                                className="bg-blue-50 border border-blue-200 rounded p-4"
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold text-lg">{balance.currency}</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Available</p>
                                        <p className="text-xl font-bold">
                                            {balance.currency} {balance.available.toFixed(2)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Current</p>
                                        <p className="text-xl font-bold">
                                            {balance.currency} {balance.current.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4 text-gray-500">No balances found</div>
                )}
            </div>
        </div>
    );
};

