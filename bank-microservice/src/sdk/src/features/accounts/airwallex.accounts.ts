import { Injectable, Logger } from '@nestjs/common';
import type { IHttpClient } from '../../shared/interfaces/https-client.interface';
import { AIRWALLEX_CONSTANTS } from '../../shared/constants/airwallex.constants';
import { HttpRequestBuilder } from '../../shared/builders/http-request.builder';
import { AirwallexTransformer } from '../../shared/transformers/airwallex.transformer';
import type { AirwallexAccount } from '../../shared/types/airwallex';
import type { StandardAccount } from '../../shared/types/common';

@Injectable()
export class AirwallexAccounts {
    private readonly logger = new Logger(AirwallexAccounts.name);
    private readonly transformer = new AirwallexTransformer();

    /**
     * Get account details
     */
    async getAccounts(httpClient: IHttpClient, config: { baseUrl?: string }): Promise<StandardAccount[]> {
        const baseUrl = config.baseUrl || AIRWALLEX_CONSTANTS.BASE_URL;
        this.logger.debug(`[AirwallexAccounts] Getting account`);

        try {
            const requestConfig = HttpRequestBuilder.get(AIRWALLEX_CONSTANTS.ENDPOINTS.GET_ACCOUNTS)
                .baseUrl(baseUrl)
                .build();
            const response = await httpClient.request<AirwallexAccount>(requestConfig);

            return this.transformer.transformAccounts(response.data);
        } catch (error: any) {
            this.logger.error(`[AirwallexAccounts] Failed to get account`, {
                error: error.message,
                status: error.response?.status,
                responseData: error.response?.data,
            });
            throw new Error(`Failed to get Airwallex account: ${error.message || 'Unknown error'}`);
        }
    }
}

