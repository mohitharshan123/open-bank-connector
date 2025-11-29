import { Logger } from '@nestjs/common';
import { ProviderNotInitializedException, ProviderOperationException } from '../../../exceptions/provider.exception';
import { ProviderInstance, StandardBalance } from '../../../sdk';
import { ProviderType } from '../../../types/provider.enum';

export class AirwallexBalances {
    constructor(
        private readonly providerInstance: ProviderInstance,
        private readonly logger: Logger,
    ) { }

    /**
     * Get balances for Airwallex
     */
    async getBalances(): Promise<StandardBalance[]> {
        this.logger.debug(`Getting balances for Airwallex`);

        try {
            const result = await this.providerInstance.getBalances();
            this.logger.log(`Successfully retrieved ${result.length} balances from Airwallex`);
            return result;
        } catch (error) {
            if (error instanceof ProviderNotInitializedException) {
                throw error;
            }

            this.logger.error(`Failed to get balances from Airwallex: ${error.message}`, error.stack);
            throw new ProviderOperationException(ProviderType.AIRWALLEX, 'get balances', error);
        }
    }
}

