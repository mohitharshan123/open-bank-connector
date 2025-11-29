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

    private readonly authentication: AirwallexAuthentication;
    private readonly accounts: AirwallexAccounts;
    private readonly balances: AirwallexBalances;

    constructor(httpClient: IHttpClient, config: AirwallexConfig, logger?: Logger, authHttpClient?: IHttpClient) {
        super(httpClient, config);
        this.logger = logger || new Logger(AirwallexProvider.name);
        this.authHttpClient = authHttpClient || httpClient;

        if (!config.apiKey || !config.clientId) {
            throw new Error('Airwallex apiKey and clientId are required');
        }

        this.authentication = new AirwallexAuthentication(this.authHttpClient, config, this.logger);
        this.accounts = new AirwallexAccounts(this.httpClient, config, this.logger);
        this.balances = new AirwallexBalances(this.httpClient, config, this.logger);
    }

    getProviderName(): string {
        return 'airwallex';
    }

    /**
     * Authenticate with Airwallex API to get bearer token
     */
    async authenticate(): Promise<AirwallexAuthResponse> {
        return this.authentication.authenticate();
    }

    /**
     * Get account details
     */
    async getAccount(): Promise<StandardAccount[]> {
        return this.accounts.getAccounts();
    }

    /**
     * Get account balances
     */
    async getBalances(): Promise<StandardBalance[]> {
        return this.balances.getBalances();
    }

    /**
     * Get jobs - Airwallex doesn't have jobs, returns empty array
     */
    async getJobs(userId?: string, jobId?: string): Promise<StandardJob[]> {
        this.logger.debug(`[AirwallexProvider] getJobs called - Airwallex doesn't support jobs, returning empty array`);
        return [];
    }
}
