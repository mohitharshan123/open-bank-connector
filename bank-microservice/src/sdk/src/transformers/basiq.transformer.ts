import { Injectable, Logger } from '@nestjs/common';
import {
    BasiqAccount,
    BasiqBalance,
} from '../types/basiq';
import {
    StandardAccount,
    StandardBalance,
} from '../types/common';
import { BaseTransformer } from './base.transformer';

/**
 * Transformer for Basiq API responses to standard format
 */
@Injectable()
export class BasiqTransformer extends BaseTransformer<
    BasiqAccount,
    BasiqBalance
> {
    private logger: Logger;

    constructor(logger?: Logger) {
        super('basiq');
        this.logger = logger || new Logger(BasiqTransformer.name);
    }

    transformAccount(account: BasiqAccount): StandardAccount {
        this.logger.debug(`[BasiqTransformer] Transforming account`, {
            account,
        });
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

    transformBalances(balances: BasiqBalance[]): StandardBalance[] {
        return balances.map(balance => ({
            available: balance.available_amount || 0,
            current: balance.total_amount || 0,
            currency: balance.currency || '',
            provider: this.providerName,
        }));
    }
}
