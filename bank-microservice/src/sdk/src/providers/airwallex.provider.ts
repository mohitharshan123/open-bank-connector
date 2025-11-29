import { Injectable, Logger } from '@nestjs/common';
import { AirwallexAccounts } from '../features/accounts/airwallex.accounts';
import { AirwallexAuthentication } from '../features/authentication/airwallex.authentication';
import { AirwallexBalances } from '../features/balances/airwallex.balances';
import type { IHttpClient } from '../shared/interfaces/https-client.interface';
import type { AirwallexAuthResponse, AirwallexConfig } from '../shared/types/airwallex';
import { StandardAccount, StandardBalance, StandardJob } from '../shared/types/common';
import { BaseProvider } from './base.provider';

@Injectable()
export class AirwallexProvider extends BaseProvider {
    private readonly logger: Logger;
    private readonly authHttpClient: IHttpClient;
    protected readonly config: AirwallexConfig;

    constructor(
        httpClient: IHttpClient,
        config: AirwallexConfig,
        logger?: Logger,
        authHttpClient?: IHttpClient,
        private readonly airwallexAuthentication?: AirwallexAuthentication,
        private readonly airwallexAccounts?: AirwallexAccounts,
        private readonly airwallexBalances?: AirwallexBalances,
    ) {
        super(httpClient, config);
        this.logger = logger || new Logger(AirwallexProvider.name);
        this.authHttpClient = authHttpClient || httpClient;
        this.config = config;

        if (!config.apiKey || !config.clientId) {
            throw new Error('Airwallex apiKey and clientId are required');
        }
    }

    getProviderName(): string {
        return 'airwallex';
    }

    /**
     * Authenticate with Airwallex API to get bearer token
     */
    async authenticate(userId?: string): Promise<AirwallexAuthResponse> {
        if (!this.airwallexAuthentication) {
            throw new Error('AirwallexAuthentication service not injected');
        }
        return this.airwallexAuthentication.authenticate(this.authHttpClient, this.config);
    }

    /**
     * Get account details
     */
    async getAccount(): Promise<StandardAccount[]> {
        if (!this.airwallexAccounts) {
            throw new Error('AirwallexAccounts service not injected');
        }
        return this.airwallexAccounts.getAccounts(this.httpClient, this.config);
    }

    /**
     * Get account balances
     */
    async getBalances(): Promise<StandardBalance[]> {
        if (!this.airwallexBalances) {
            throw new Error('AirwallexBalances service not injected');
        }
        return this.airwallexBalances.getBalances(this.httpClient, this.config);
    }

    /**
     * Get jobs - Airwallex doesn't have jobs, returns empty array
     */
    async getJobs(userId?: string, jobId?: string): Promise<StandardJob[]> {
        this.logger.debug(`[AirwallexProvider] getJobs called - Airwallex doesn't support jobs, returning empty array`);
        return [];
    }
}
