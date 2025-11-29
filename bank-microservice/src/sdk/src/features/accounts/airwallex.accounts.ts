import { Injectable, Logger } from '@nestjs/common';
import type { IHttpClient } from '../../shared/interfaces/https-client.interface';
import { AIRWALLEX_CONSTANTS } from '../../shared/constants/airwallex.constants';
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
            const response = await httpClient.request<AirwallexAccount>({
                method: 'GET',
                url: AIRWALLEX_CONSTANTS.ENDPOINTS.GET_ACCOUNTS,
                baseURL: baseUrl,
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

