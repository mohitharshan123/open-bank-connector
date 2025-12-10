import { Injectable, Logger } from '@nestjs/common';
import { HttpRequestBuilder } from '../../shared/builders/http-request.builder';
import { UrlBuilder } from '../../shared/builders/url.builder';
import { FISKIL_CONSTANTS } from '../../shared/constants/fiskil.constants';
import type { IHttpClient } from '../../shared/interfaces/https-client.interface';
import { FiskilTransformer } from '../../shared/transformers/fiskil.transformer';
import { StandardTransaction } from '../../shared/types/common';
import type { FiskilTransactionsResponse } from '../../shared/types/fiskil';

@Injectable()
export class FiskilTransactions {
    private readonly logger = new Logger(FiskilTransactions.name);
    private readonly transformer: FiskilTransformer;

    constructor() {
        this.transformer = new FiskilTransformer();
    }

    /**
     * Get transactions for a Fiskil end user
     * GET /v1/banking/transactions with end_user_id query param
     * Optional: account_id, from, to, status, page[after], page[before], page[size]
     */
    async getTransactions(
        httpClient: IHttpClient,
        config: { baseUrl?: string },
        endUserId: string,
        accountId?: string,
        from?: string,
        to?: string,
        status?: 'PENDING' | 'POSTED',
        pageAfter?: string,
        pageBefore?: string,
        pageSize?: number,
    ): Promise<{ transactions: StandardTransaction[]; links?: { next?: string; prev?: string } }> {
        this.logger.log('[FiskilTransactions] Getting transactions', {
            end_user_id: endUserId,
            account_id: accountId,
        });

        try {
            const baseUrl = config.baseUrl || FISKIL_CONSTANTS.BASE_URL;

            const url = UrlBuilder.create(baseUrl)
                .path(FISKIL_CONSTANTS.ENDPOINTS.GET_TRANSACTIONS)
                .queryParams({
                    end_user_id: endUserId,
                    account_id: accountId,
                    from: from,
                    to: to,
                    status: status,
                    'page[after]': pageAfter,
                    'page[before]': pageBefore,
                    'page[size]': pageSize,
                })
                .build();

            const requestConfig = HttpRequestBuilder.get(url)
                .headers({
                    'Content-Type': FISKIL_CONSTANTS.HEADERS.CONTENT_TYPE,
                    'Accept': FISKIL_CONSTANTS.HEADERS.ACCEPT,
                })
                .build();

            const response = await httpClient.request<FiskilTransactionsResponse>(requestConfig);

            this.logger.log('[FiskilTransactions] Transactions retrieved successfully', {
                count: response.data?.transactions?.length || 0,
                hasNext: !!response.data?.links?.next,
                hasPrev: !!response.data?.links?.prev,
            });

            const transactions = this.transformer.transformTransactions(response.data?.transactions || []);

            return {
                transactions,
                links: response.data?.links,
            };
        } catch (error: any) {
            this.logger.error('[FiskilTransactions] Failed to get transactions', {
                error: error.message,
                end_user_id: endUserId,
                account_id: accountId,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data,
            });
            throw new Error(`Fiskil transactions fetch failed: ${error.message || 'Unknown error'}`);
        }
    }
}

