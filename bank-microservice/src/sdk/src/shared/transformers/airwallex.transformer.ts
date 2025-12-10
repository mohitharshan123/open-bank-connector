import {
    AirwallexAccount,
    AirwallexAccountBalance,
    AirwallexTransaction,
} from '../types/airwallex';
import {
    StandardAccount,
    StandardBalance,
    StandardTransaction,
    TransactionType,
} from '../types/common';
import { BaseTransformer } from './base.transformer';

/**
 * Transformer for Airwallex API responses to standard format
 */
export class AirwallexTransformer extends BaseTransformer<
    AirwallexAccount,
    AirwallexAccountBalance,
    AirwallexTransaction
> {
    constructor() {
        super('airwallex');
    }

    transformAccounts(account: AirwallexAccount): StandardAccount[] {
        const accountName = account.nickname ||
            account.account_details?.business_details?.business_name_english ||
            account.account_details?.business_details?.business_name ||
            '';

        return [{
            id: account.id,
            accountNumber: account.id,
            accountName,
            balance: 0,
            currency: '',
            type: account.account_details?.legal_entity_type?.toLowerCase() || 'unknown',
            provider: this.providerName,
        }];
    }

    transformBalances(balances: AirwallexAccountBalance[]): StandardBalance[] {
        return balances.map(balance => ({
            available: balance.available_amount / 100,
            current: balance.total_amount / 100,
            currency: balance.currency,
            provider: this.providerName,
        }));
    }

    transformTransactions(transactions: AirwallexTransaction[]): StandardTransaction[] {
        return transactions.map(transaction => ({
            id: transaction.id,
            accountId: transaction.account_id,
            amount: transaction.amount,
            currency: transaction.currency,
            description: transaction.description,
            date: transaction.created_at,
            type: transaction.type as TransactionType,
            provider: this.providerName,
        }));
    }
}

