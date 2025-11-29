import { Injectable, Logger } from '@nestjs/common';
import type { IHttpClient } from '../../shared/interfaces/https-client.interface';
import { BASIQ_CONSTANTS } from '../../shared/constants/basiq.constants';
import { BasiqTransformer } from '../../shared/transformers/basiq.transformer';
import type { BasiqAccount } from '../../shared/types/basiq';
import type { StandardAccount } from '../../shared/types/common';

@Injectable()
export class BasiqAccounts {
    private readonly logger = new Logger(BasiqAccounts.name);
    private readonly transformer = new BasiqTransformer(this.logger);

    /**
     * Get account details for a Basiq user (returns array of accounts)
     */
    async getAccounts(httpClient: IHttpClient, config: { baseUrl?: string }, userId: string): Promise<StandardAccount[]> {
        if (!userId) {
            throw new Error('Basiq userId is required to get accounts');
        }

        const baseUrl = config.baseUrl || BASIQ_CONSTANTS.BASE_URL;
        this.logger.debug(`[BasiqAccounts] Getting accounts for userId: ${userId}`);

        try {
            const endpoint = BASIQ_CONSTANTS.ENDPOINTS.GET_ACCOUNTS(userId);
            const response = await httpClient.request<{ data: BasiqAccount[] }>({
                method: 'GET',
                url: endpoint,
                baseURL: baseUrl,
                headers: { 'Content-Type': 'application/json' },
            });

            return this.transformer.transformAccounts(response.data);
        } catch (error: any) {
            this.logger.error(`[BasiqAccounts] Failed to get accounts`, {
                error: error.message,
                userId,
                status: error.response?.status,
                responseData: error.response?.data,
            });
            throw new Error(`Failed to get Basiq accounts: ${error.message || 'Unknown error'}`);
        }
    }
}

