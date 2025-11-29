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
                throw new ProviderOperationException(ProviderType.BASIQ, 'get balances', new Error('Token validation failed'));
            }

            const userId = tokenDoc.userId;
            if (!userId) {
                throw new ProviderOperationException(ProviderType.BASIQ, 'get balances', new Error('User ID not found in token'));
            }

            const result = await this.providerInstance.getBalances(userId);
            this.logger.log(`Successfully retrieved ${result.length} balances from Basiq`);
            return result;
        } catch (error) {
            if (error instanceof ProviderNotInitializedException || error instanceof ProviderOperationException) {
                throw error;
            }

            this.logger.error(`Failed to get balances from Basiq: ${error.message}`, error.stack);
            throw new ProviderOperationException(ProviderType.BASIQ, 'get balances', error);
        }
    }
}

