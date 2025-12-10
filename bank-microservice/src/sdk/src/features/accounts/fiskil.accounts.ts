import { Injectable, Logger } from '@nestjs/common';
import { HttpRequestBuilder } from '../../shared/builders/http-request.builder';
import { FISKIL_CONSTANTS } from '../../shared/constants/fiskil.constants';
import type { IHttpClient } from '../../shared/interfaces/https-client.interface';
import { FiskilTransformer } from '../../shared/transformers/fiskil.transformer';
import type { StandardAccount } from '../../shared/types/common';
import type { FiskilAccountsResponse } from '../../shared/types/fiskil';

@Injectable()
export class FiskilAccounts {
    private readonly logger = new Logger(FiskilAccounts.name);
    private readonly transformer = new FiskilTransformer();

    /**
     * Get account details
     * @param endUserId - The end user ID (required by Fiskil API)
     */
    async getAccounts(
        httpClient: IHttpClient,
        config: { baseUrl?: string },
        endUserId: string,
    ): Promise<StandardAccount[]> {
        const baseUrl = config.baseUrl || FISKIL_CONSTANTS.BASE_URL;
        this.logger.debug(`[FiskilAccounts] Getting accounts for end_user_id: ${endUserId}`);

        try {
            const requestConfig = HttpRequestBuilder.get(FISKIL_CONSTANTS.ENDPOINTS.GET_ACCOUNTS)
                .baseUrl(baseUrl)
                .params({ end_user_id: endUserId })
                .build();

            const response = await httpClient.request<FiskilAccountsResponse>(requestConfig);

            const accounts = response.data?.accounts || [];
            return this.transformer.transformAccounts(accounts);
        } catch (error: any) {
            this.logger.error(`[FiskilAccounts] Failed to get accounts`, {
                error: error.message,
                status: error.response?.status,
                responseData: error.response?.data,
            });
            throw new Error(`Failed to get Fiskil accounts: ${error.message || 'Unknown error'}`);
        }
    }
}

