import type { ProviderType } from '../api/bankApi';
import { useAccount } from '../hooks/useBankQueries';

interface AccountDetailsProps {
    provider: ProviderType;
    companyId: string;
}

export const AccountDetails = ({ provider, companyId }: AccountDetailsProps) => {
    const { data: accounts, isLoading: accountsLoading } = useAccount(provider, companyId);

    if (accountsLoading) {
        return (
            <div className="text-center py-8">Loading balance details...</div>
        );
    }

    return (
        <div className="mt-6">
            <div>
                <h3 className="text-xl font-bold mb-4">Balances</h3>
                {accounts && accounts.length > 0 ? (
                    <div className="grid gap-4">
                        {accounts.map((account, index) => (
                            <div
                                key={index}
                                className="bg-blue-50 border border-blue-200 rounded p-4"
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold text-lg">{account.currency}</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Available</p>
                                        <p className="text-xl font-bold">
                                            {account.currency} {account.balance.toFixed(2)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Current</p>
                                        <p className="text-xl font-bold">
                                            {account.currency} {account.balance.toFixed(2)}
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

