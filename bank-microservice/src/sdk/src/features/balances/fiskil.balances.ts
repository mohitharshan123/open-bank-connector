import { Injectable, Logger } from '@nestjs/common';
import { HttpRequestBuilder } from '../../shared/builders/http-request.builder';
import { FISKIL_CONSTANTS } from '../../shared/constants/fiskil.constants';
import type { IHttpClient } from '../../shared/interfaces/https-client.interface';
import { FiskilTransformer } from '../../shared/transformers/fiskil.transformer';
import type { StandardBalance } from '../../shared/types/common';
import type { FiskilBalancesResponse } from '../../shared/types/fiskil';

@Injectable()
export class FiskilBalances {
    private readonly logger = new Logger(FiskilBalances.name);
    private readonly transformer = new FiskilTransformer();

    /**
     * Get account balances
     * @param endUserId - The end user ID (required by Fiskil API)
     * @param accountId - Optional account ID to filter balances
     */
    async getBalances(
        httpClient: IHttpClient,
        config: { baseUrl?: string },
        endUserId: string,
        accountId?: string,
    ): Promise<StandardBalance[]> {
        const baseUrl = config.baseUrl || FISKIL_CONSTANTS.BASE_URL;
        this.logger.debug(`[FiskilBalances] Getting balances for end_user_id: ${endUserId}${accountId ? `, account_id: ${accountId}` : ''}`);

        try {
            const queryParams: Record<string, string> = { end_user_id: endUserId };
            if (accountId) {
                queryParams.account_id = accountId;
            }

            const requestConfig = HttpRequestBuilder.get(FISKIL_CONSTANTS.ENDPOINTS.GET_BALANCES)
                .baseUrl(baseUrl)
                .params(queryParams)
                .build();

            const response = await httpClient.request<FiskilBalancesResponse>(requestConfig);

            const balances = response.data?.balances || [];
            return this.transformer.transformBalances(balances);
        } catch (error: any) {
            this.logger.error(`[FiskilBalances] Failed to get balances`, {
                error: error.message,
                status: error.response?.status,
                responseData: error.response?.data,
            });
            throw new Error(`Failed to get Fiskil balances: ${error.message || 'Unknown error'}`);
        }
    }
}

