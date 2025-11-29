import { Logger } from '@nestjs/common';
import type { IHttpClient } from '../../shared/interfaces/https-client.interface';
import { AIRWALLEX_CONSTANTS } from '../../shared/constants/airwallex.constants';
import { AirwallexTransformer } from '../../shared/transformers/airwallex.transformer';
import type { AirwallexAccountBalance } from '../../shared/types/airwallex';
import type { StandardBalance } from '../../shared/types/common';

export class AirwallexBalances {
    private readonly transformer: AirwallexTransformer;
    private readonly baseUrl: string;

    constructor(
        private readonly httpClient: IHttpClient,
        config: { baseUrl?: string },
        private readonly logger: Logger
    ) {
        this.transformer = new AirwallexTransformer();
        this.baseUrl = config.baseUrl || AIRWALLEX_CONSTANTS.BASE_URL;
    }

    /**
     * Get account balances
     */
    async getBalances(): Promise<StandardBalance[]> {
        this.logger.debug(`[AirwallexBalances] Getting balances`);

        try {
            const response = await this.httpClient.request<AirwallexAccountBalance[]>({
                method: 'GET',
                url: AIRWALLEX_CONSTANTS.ENDPOINTS.GET_BALANCES,
                baseURL: this.baseUrl,
                headers: { 'Content-Type': 'application/json' },
            });

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

