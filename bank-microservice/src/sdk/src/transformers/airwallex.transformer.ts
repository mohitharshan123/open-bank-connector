import {
    AirwallexAccount,
    AirwallexAccountBalance,
} from '../types/airwallex';
import {
    StandardAccount,
    StandardBalance,
} from '../types/common';
import { BaseTransformer } from './base.transformer';

/**
 * Transformer for Airwallex API responses to standard format
 */
export class AirwallexTransformer extends BaseTransformer<
    AirwallexAccount,
    AirwallexAccountBalance
> {
    constructor() {
        super('airwallex');
    }

    transformAccount(account: AirwallexAccount): StandardAccount {
        const accountName = account.nickname ||
            account.account_details?.business_details?.business_name_english ||
            account.account_details?.business_details?.business_name ||
            '';

        return {
            id: account.id,
            accountNumber: account.id,
            accountName,
            balance: 0,
            currency: '',
            type: account.account_details?.legal_entity_type?.toLowerCase() || 'unknown',
            provider: this.providerName,
        };
    }

    transformBalances(balances: AirwallexAccountBalance[]): StandardBalance[] {
        return balances.map(balance => ({
            available: balance.available_amount / 100,
            current: balance.total_amount / 100,
            currency: balance.currency,
            provider: this.providerName,
        }));
    }
}

