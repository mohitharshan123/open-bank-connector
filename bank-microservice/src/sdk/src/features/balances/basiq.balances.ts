import { Injectable, Logger } from '@nestjs/common';
import { BASIQ_CONSTANTS } from '../../shared/constants/basiq.constants';
import type { IHttpClient } from '../../shared/interfaces/https-client.interface';
import { HttpRequestBuilder } from '../../shared/builders/http-request.builder';
import { BasiqTransformer } from '../../shared/transformers/basiq.transformer';
import type { BasiqBalance } from '../../shared/types/basiq';
import type { StandardBalance } from '../../shared/types/common';

@Injectable()
export class BasiqBalances {
    private readonly logger = new Logger(BasiqBalances.name);
    private readonly transformer = new BasiqTransformer(this.logger);

    /**
     * Get account balances for a Basiq user
     */
    async getBalances(httpClient: IHttpClient, config: { baseUrl?: string }, userId: string): Promise<StandardBalance[]> {
        if (!userId) {
            throw new Error('Basiq userId is required to get balances');
        }

        const baseUrl = config.baseUrl || BASIQ_CONSTANTS.BASE_URL;
        this.logger.debug(`[BasiqBalances] Getting balances for userId: ${userId}`);

        try {
            const endpoint = BASIQ_CONSTANTS.ENDPOINTS.GET_BALANCES(userId);
            const requestConfig = HttpRequestBuilder.get(endpoint)
                .baseUrl(baseUrl)
                .build();
            const response = await httpClient.request<BasiqBalance[] | { data: BasiqBalance[] }>(requestConfig);

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

