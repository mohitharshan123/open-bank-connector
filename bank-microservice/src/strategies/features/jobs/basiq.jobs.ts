import { Injectable, Logger } from '@nestjs/common';
import { ProviderNotInitializedException, ProviderOperationException } from '../../../exceptions/provider.exception';
import { isBasiqToken } from '../../../schemas/token.schema';
import { ProviderInstance, StandardJob } from '../../../sdk';
import { TokenService } from '../../../services/token.service';
import { ProviderType } from '../../../types/provider.enum';

@Injectable()
export class BasiqJobs {
    private readonly logger = new Logger(BasiqJobs.name);

    constructor(private readonly tokenService: TokenService) { }

    /**
     * Get jobs for Basiq user
     */
    async getJobs(providerInstance: ProviderInstance, companyId: string, jobId?: string): Promise<StandardJob[]> {
        this.logger.debug(`Getting jobs for Basiq`, { jobId });

        try {
            const tokenDoc = await this.tokenService.getActiveToken(ProviderType.BASIQ, companyId);

            if (!tokenDoc || !isBasiqToken(tokenDoc)) {
                throw new ProviderOperationException(ProviderType.BASIQ, 'get jobs', new Error('Token validation failed'));
            }

            const userId = tokenDoc.userId;
            if (!userId) {
                throw new ProviderOperationException(ProviderType.BASIQ, 'get jobs', new Error('User ID not found in token'));
            }

            const result = await providerInstance.getJobs(userId, jobId);
            this.logger.log(`Successfully retrieved ${result.length} job(s) from Basiq`);
            return result;
        } catch (error: any) {
            if (error instanceof ProviderNotInitializedException || error instanceof ProviderOperationException) {
                throw error;
            }

            this.logger.error(`Failed to get jobs from Basiq: ${error.message}`, error.stack);
            throw new ProviderOperationException(ProviderType.BASIQ, 'get jobs', error);
        }
    }
}

