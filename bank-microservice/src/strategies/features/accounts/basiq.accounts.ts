import { Logger } from '@nestjs/common';
import { ProviderNotInitializedException, ProviderOperationException } from '../../../exceptions/provider.exception';
import { isBasiqToken } from '../../../schemas/token.schema';
import { ProviderInstance, StandardAccount } from '../../../sdk';
import { TokenService } from '../../../services/token.service';
import { ProviderType } from '../../../types/provider.enum';

export class BasiqAccounts {
    constructor(
        private readonly providerInstance: ProviderInstance,
        private readonly tokenService: TokenService,
        private readonly companyId: string,
        private readonly logger: Logger,
    ) { }

    /**
     * Get accounts for Basiq user
     */
    async getAccounts(): Promise<StandardAccount[]> {
        this.logger.debug(`Getting accounts for Basiq`);

        try {
            const tokenDoc = await this.tokenService.getActiveToken(ProviderType.BASIQ, this.companyId);

            if (!tokenDoc || !isBasiqToken(tokenDoc)) {
                throw new ProviderOperationException(ProviderType.BASIQ, 'get account', new Error('Token validation failed'));
            }

            const userId = tokenDoc.userId;
            if (!userId) {
                this.logger.error(`[BasiqAccounts] userId not found in token doc`);
                throw new ProviderOperationException(ProviderType.BASIQ, 'get account', new Error('User ID not found in token'));
            }

            const result = await this.providerInstance.getAccount(userId);
            this.logger.log(`Successfully retrieved ${result.length} account(s) from Basiq`);
            return result;
        } catch (error) {
            if (error instanceof ProviderNotInitializedException || error instanceof ProviderOperationException) {
                throw error;
            }

            this.logger.error(`Failed to get account from Basiq: ${error.message}`, error.stack);
            throw new ProviderOperationException(ProviderType.BASIQ, 'get account', error);
        }
    }
}

