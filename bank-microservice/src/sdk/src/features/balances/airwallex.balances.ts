import { Injectable, Logger } from '@nestjs/common';
import type { IHttpClient } from '../../shared/interfaces/https-client.interface';
import { AIRWALLEX_CONSTANTS } from '../../shared/constants/airwallex.constants';
import { HttpRequestBuilder } from '../../shared/builders/http-request.builder';
import { AirwallexTransformer } from '../../shared/transformers/airwallex.transformer';
import type { AirwallexAccountBalance } from '../../shared/types/airwallex';
import type { StandardBalance } from '../../shared/types/common';

@Injectable()
export class AirwallexBalances {
    private readonly logger = new Logger(AirwallexBalances.name);
    private readonly transformer = new AirwallexTransformer();

    /**
     * Get account balances
     */
    async getBalances(httpClient: IHttpClient, config: { baseUrl?: string }): Promise<StandardBalance[]> {
        const baseUrl = config.baseUrl || AIRWALLEX_CONSTANTS.BASE_URL;
        this.logger.debug(`[AirwallexBalances] Getting balances`);

        try {
            const requestConfig = HttpRequestBuilder.get(AIRWALLEX_CONSTANTS.ENDPOINTS.GET_BALANCES)
                .baseUrl(baseUrl)
                .build();
            const response = await httpClient.request<AirwallexAccountBalance[]>(requestConfig);

            const balancesData = Array.isArray(response.data) ? response.data : (response.data as any).data || [];
            return this.transformer.transformBalances(balancesData);
        } catch (error: any) {
            this.logger.error(`[AirwallexBalances] Failed to get balances`, {
                error: error.message,
                status: error.response?.status,
                responseData: error.response?.data,
            });
            throw new Error(`Failed to get Airwallex balances: ${error.message || 'Unknown error'}`);
        }
    }
}

