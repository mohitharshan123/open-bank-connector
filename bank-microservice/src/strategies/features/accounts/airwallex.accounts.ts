import { Logger } from '@nestjs/common';
import { ProviderNotInitializedException, ProviderOperationException } from '../../../exceptions/provider.exception';
import { ProviderInstance, StandardAccount } from '../../../sdk';
import { ProviderType } from '../../../types/provider.enum';

export class AirwallexAccounts {
    constructor(
        private readonly providerInstance: ProviderInstance,
        private readonly logger: Logger,
    ) { }

    /**
     * Get accounts for Airwallex
     */
    async getAccounts(): Promise<StandardAccount[]> {
        this.logger.debug(`Getting accounts for Airwallex`);

        try {
            const result = await this.providerInstance.getAccount();
            this.logger.log(`Successfully retrieved ${result.length} account(s) from Airwallex`);
            return result;
        } catch (error) {
            if (error instanceof ProviderNotInitializedException) {
                throw error;
            }

            this.logger.error(`Failed to get accounts from Airwallex: ${error.message}`, error.stack);
            throw new ProviderOperationException(ProviderType.AIRWALLEX, 'get accounts', error);
        }
    }
}

