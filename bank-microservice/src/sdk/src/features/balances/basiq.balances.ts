import { Logger } from '@nestjs/common';
import { BASIQ_CONSTANTS } from '../../shared/constants/basiq.constants';
import type { IHttpClient } from '../../shared/interfaces/https-client.interface';
import { BasiqTransformer } from '../../shared/transformers/basiq.transformer';
import type { BasiqBalance } from '../../shared/types/basiq';
import type { StandardBalance } from '../../shared/types/common';

export class BasiqBalances {
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
     * Get account balances for a Basiq user
     */
    async getBalances(userId: string): Promise<StandardBalance[]> {
        if (!userId) {
            throw new Error('Basiq userId is required to get balances');
        }

        this.logger.debug(`[BasiqBalances] Getting balances for userId: ${userId}`);

        try {
            const endpoint = BASIQ_CONSTANTS.ENDPOINTS.GET_BALANCES(userId);
            const response = await this.httpClient.request<BasiqBalance[] | { data: BasiqBalance[] }>({
                method: 'GET',
                url: endpoint,
                baseURL: this.baseUrl,
                headers: { 'Content-Type': 'application/json' },
            });

            return this.transformer.transformBalances(response.data);
        } catch (error: any) {
            this.logger.error(`[BasiqBalances] Failed to get balances`, {
                error: error.message,
                userId,
                status: error.response?.status,
                responseData: error.response?.data,
            });
            throw new Error(`Failed to get Basiq balances: ${error.message || 'Unknown error'}`);
        }
    }
}

