import type { ProviderType } from '../api/bankApi';
import { useTransactions } from '../hooks/useBankQueries';

interface TransactionsListProps {
    provider: ProviderType;
    companyId: string;
    userId?: string;
    accountId?: string;
}

export const TransactionsList = ({ provider, companyId, userId, accountId }: TransactionsListProps) => {
    const { data, isLoading, error } = useTransactions(provider, companyId, userId, accountId, undefined, undefined, undefined, true);

    if (isLoading) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading transactions...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">Error loading transactions: {(error as Error).message}</p>
            </div>
        );
    }

    if (!data?.transactions || data.transactions.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <p>No transactions found.</p>
            </div>
        );
    }

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return dateString;
        }
    };

    const formatAmount = (amount: number, currency: string, type: 'debit' | 'credit') => {
        const sign = type === 'debit' ? '-' : '+';
        return `${sign}${currency} ${Math.abs(amount).toFixed(2)}`;
    };

    return (
        <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Transactions ({data.transactions.length})</h3>
                {data.links && (data.links.next || data.links.prev) && (
                    <div className="text-sm text-gray-500">
                        {data.links.prev && <span className="mr-4">Has previous page</span>}
                        {data.links.next && <span>Has next page</span>}
                    </div>
                )}
            </div>
            <div className="space-y-3">
                {data.transactions.map((transaction) => (
                    <div
                        key={transaction.id}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="font-semibold text-gray-900">{transaction.description || 'No description'}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <p className="text-sm text-gray-600">{formatDate(transaction.date)}</p>
                                            {transaction.category && (
                                                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                                    {transaction.category}
                                                </span>
                                            )}
                                            {transaction.subCategory && (
                                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                                    {transaction.subCategory}
                                                </span>
                                            )}
                                        </div>
                                        {transaction.reference && (
                                            <p className="text-xs text-gray-500 mt-1">Ref: {transaction.reference}</p>
                                        )}
                                        {transaction.status && (
                                            <span className={`inline-block text-xs px-2 py-1 rounded mt-1 ${transaction.status === 'POSTED'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {transaction.status}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className={`text-right ml-4 ${transaction.type === 'debit' ? 'text-red-600' : 'text-green-600'}`}>
                                <p className="font-bold text-lg">
                                    {formatAmount(transaction.amount, transaction.currency, transaction.type)}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

