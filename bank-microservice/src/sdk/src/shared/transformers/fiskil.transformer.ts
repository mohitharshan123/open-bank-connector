import {
    StandardAccount,
    StandardBalance,
    StandardTransaction,
    TransactionStatus,
    TransactionType,
} from '../types/common';
import {
    FiskilAccount,
    FiskilBalance,
    FiskilTransaction,
} from '../types/fiskil';
import { BaseTransformer } from './base.transformer';

/**
 * Transformer for Fiskil API responses to standard format
 */
export class FiskilTransformer extends BaseTransformer<
    FiskilAccount,
    FiskilBalance,
    FiskilTransaction
> {
    constructor() {
        super('fiskil');
    }

    transformAccounts(accounts: FiskilAccount | FiskilAccount[]): StandardAccount[] {
        const accountsArray = Array.isArray(accounts) ? accounts : [accounts];

        return accountsArray.map(account => ({
            id: account.account_id || account.fiskil_id,
            accountNumber: account.account_number || account.masked_number || account.account_id,
            accountName: account.display_name || account.nickname || account.product_name || '',
            balance: 0,
            currency: account.currency || 'AUD',
            type: account.product_category?.toLowerCase() || 'unknown',
            provider: this.providerName,
        }));
    }

    transformBalances(balances: FiskilBalance | FiskilBalance[]): StandardBalance[] {
        const balancesArray = Array.isArray(balances) ? balances : [balances];

        return balancesArray.map(balance => ({
            available: parseFloat(balance.available_balance) || 0,
            current: parseFloat(balance.current_balance) || 0,
            currency: balance.currency || 'AUD',
            provider: this.providerName,
        }));
    }

    transformTransactions(transactions: FiskilTransaction | FiskilTransaction[]): StandardTransaction[] {
        const transactionsArray = Array.isArray(transactions) ? transactions : [transactions];

        return transactionsArray.map(transaction => {
            const amount = parseFloat(transaction.amount) || 0;
            const isDebit = amount < 0;

            return {
                id: transaction.fiskil_id || transaction.transaction_id,
                accountId: transaction.account_id,
                amount: Math.abs(amount),
                currency: transaction.currency || 'AUD',
                description: transaction.description || '',
                date: transaction.posting_date_time || transaction.execution_date_time || new Date().toISOString(),
                type: isDebit ? TransactionType.DEBIT : TransactionType.CREDIT,
                category: transaction.category?.primary_category,
                subCategory: transaction.category?.secondary_category,
                status: transaction.status as TransactionStatus,
                reference: transaction.reference,
                provider: this.providerName,
            };
        });
    }
}

