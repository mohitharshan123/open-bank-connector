import { Logger } from '@nestjs/common';
import type { IHttpClient } from '../../shared/interfaces/https-client.interface';
import { BASIQ_CONSTANTS } from '../../shared/constants/basiq.constants';
import { BasiqTransformer } from '../../shared/transformers/basiq.transformer';
import type { BasiqAccount } from '../../shared/types/basiq';
import type { StandardAccount } from '../../shared/types/common';

export class BasiqAccounts {
    private readonly transformer: BasiqTransformer;
    private readonly baseUrl: string;

    constructor(
        private readonly httpClient: IHttpClient,
        config: { baseUrl?: string },
        private readonly logger: Logger
    ) {
        this.transformer = new BasiqTransformer(this.logger);
        this.baseUrl = config.baseUrl || BASIQ_CONSTANTS.BASE_URL;
    }

    /**
     * Get account details for a Basiq user (returns array of accounts)
     */
    async getAccounts(userId: string): Promise<StandardAccount[]> {
        if (!userId) {
            throw new Error('Basiq userId is required to get accounts');
        }

        this.logger.debug(`[BasiqAccounts] Getting accounts for userId: ${userId}`);

        try {
            const endpoint = BASIQ_CONSTANTS.ENDPOINTS.GET_ACCOUNTS(userId);
            const response = await this.httpClient.request<{ data: BasiqAccount[] }>({
                method: 'GET',
                url: endpoint,
                baseURL: this.baseUrl,
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

