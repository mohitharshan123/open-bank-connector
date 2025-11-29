import { Logger } from '@nestjs/common';
import type { IHttpClient } from '../../shared/interfaces/https-client.interface';
import { AIRWALLEX_CONSTANTS } from '../../shared/constants/airwallex.constants';
import { AirwallexTransformer } from '../../shared/transformers/airwallex.transformer';
import type { AirwallexAccount } from '../../shared/types/airwallex';
import type { StandardAccount } from '../../shared/types/common';

export class AirwallexAccounts {
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
     * Get account details
     */
    async getAccounts(): Promise<StandardAccount[]> {
        this.logger.debug(`[AirwallexAccounts] Getting account`);

        try {
            const response = await this.httpClient.request<AirwallexAccount>({
                method: 'GET',
                url: AIRWALLEX_CONSTANTS.ENDPOINTS.GET_ACCOUNTS,
                baseURL: this.baseUrl,
                headers: { 'Content-Type': 'application/json' },
            });

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

