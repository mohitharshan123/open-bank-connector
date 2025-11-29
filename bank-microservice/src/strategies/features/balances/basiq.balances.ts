import { Logger } from '@nestjs/common';
import { ProviderNotInitializedException, ProviderOperationException } from '../../../exceptions/provider.exception';
import { isBasiqToken } from '../../../schemas/token.schema';
import { ProviderInstance, StandardBalance } from '../../../sdk';
import { TokenService } from '../../../services/token.service';
import { ProviderType } from '../../../types/provider.enum';

export class BasiqBalances {
    constructor(
        private readonly providerInstance: ProviderInstance,
        private readonly tokenService: TokenService,
        private readonly companyId: string,
        private readonly logger: Logger,
    ) { }

    /**
     * Get balances for Basiq user
     */
    async getBalances(): Promise<StandardBalance[]> {
        this.logger.debug(`Getting balances for Basiq`);

        try {
            const tokenDoc = await this.tokenService.getActiveToken(ProviderType.BASIQ, this.companyId);
            if (!tokenDoc || !isBasiqToken(tokenDoc)) {
                throw new Error('Basiq token not found or invalid. Please authenticate first.');
            }
            const userId = tokenDoc.userId;
            if (!userId) {
                throw new Error('Basiq userId not found. Please create a user first.');
            }

            const result = await this.providerInstance.getBalances(userId);
            this.logger.log(`Successfully retrieved ${result.length} balances from Basiq`);
            return result;
        } catch (error) {
            if (error instanceof ProviderNotInitializedException) {
                throw error;
            }

            this.logger.error(`Failed to get balances from Basiq: ${error.message}`, error.stack);
            throw new ProviderOperationException(ProviderType.BASIQ, 'get balances', error);
        }
    }
}

