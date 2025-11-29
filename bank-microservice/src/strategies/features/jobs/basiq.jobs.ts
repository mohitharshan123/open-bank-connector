import { Logger } from '@nestjs/common';
import { ProviderNotInitializedException, ProviderOperationException } from '../../../exceptions/provider.exception';
import { isBasiqToken } from '../../../schemas/token.schema';
import { ProviderInstance, StandardJob } from '../../../sdk';
import { TokenService } from '../../../services/token.service';
import { ProviderType } from '../../../types/provider.enum';

export class BasiqJobs {
    constructor(
        private readonly providerInstance: ProviderInstance,
        private readonly tokenService: TokenService,
        private readonly companyId: string,
        private readonly logger: Logger,
    ) { }

    /**
     * Get jobs for Basiq user
     */
    async getJobs(jobId?: string): Promise<StandardJob[]> {
        this.logger.debug(`Getting jobs for Basiq`, { jobId });

        try {
            // Note: companyId should be passed from strategy
            const tokenDoc = await this.tokenService.getActiveToken(ProviderType.BASIQ, this.companyId);
            if (!tokenDoc || !isBasiqToken(tokenDoc)) {
                throw new Error('Basiq token not found or invalid. Please authenticate first.');
            }

            const userId = tokenDoc.userId;
            if (!userId) {
                throw new Error('Basiq userId not found. Please authenticate first to create a user.');
            }

            const result = await this.providerInstance.getJobs(userId, jobId);
            this.logger.log(`Successfully retrieved ${result.length} job(s) from Basiq`);
            return result;
        } catch (error: any) {
            if (error instanceof ProviderNotInitializedException) {
                throw error;
            }

            this.logger.error(`Failed to get jobs from Basiq: ${error.message}`, error.stack);
            throw new ProviderOperationException(ProviderType.BASIQ, 'get jobs', error);
        }
    }
}

