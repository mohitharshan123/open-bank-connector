import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import * as crypto from 'crypto';
import {
    AirwallexAuthResponse,
    IHttpClient,
    ProviderInstance,
    StandardAccount,
    StandardBalance,
} from '../sdk';
import { BankConfig } from '../config/bank.config';
import { ProviderType } from '../types/provider.enum';
import { IProviderStrategy } from './provider-strategy.interface';
import {
    ProviderNotInitializedException,
    ProviderOperationException,
} from '../exceptions/provider.exception';
import { TokenService } from '../services/token.service';
import { OpenBankSDK } from '../sdk';
import { NestJsHttpAdapter } from '../utils/nestjs-http-adapter';
import { TokenInjectingHttpClient } from '../utils/token-injecting-http-client';

@Injectable()
export class AirwallexStrategy implements IProviderStrategy {
    private readonly logger = new Logger(AirwallexStrategy.name);
    private providerInstance: ProviderInstance | null = null;
    private initializationPromise: Promise<void> | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly tokenService: TokenService,
        private readonly httpService: HttpService,
        private readonly sdk: OpenBankSDK,
    ) { }

    getProviderType(): ProviderType {
        return ProviderType.AIRWALLEX;
    }

    private createHttpClient(): IHttpClient {
        const baseClient = new NestJsHttpAdapter(this.httpService);
        return new TokenInjectingHttpClient(
            baseClient,
            ProviderType.AIRWALLEX,
            this.tokenService,
            () => this.refreshAuthToken(),
        );
    }

    private createAuthHttpClient(): IHttpClient {
        return new NestJsHttpAdapter(this.httpService);
    }

    private async initialize(): Promise<void> {
        if (this.providerInstance) {
            return;
        }

        if (this.initializationPromise) {
            await this.initializationPromise;
            return;
        }

        this.initializationPromise = this.doInitialize();
        try {
            await this.initializationPromise;
        } finally {
            this.initializationPromise = null;
        }
    }

    private async doInitialize(): Promise<void> {
        const config = this.configService.get<BankConfig['airwallex']>('bank.airwallex');

        if (!config?.apiKey || !config?.clientId) {
            throw new ProviderNotInitializedException(
                'Airwallex credentials not found. Please configure AIRWALLEX_API_KEY and AIRWALLEX_CLIENT_ID.',
            );
        }

        const httpClient = this.createHttpClient();
        const authHttpClient = this.createAuthHttpClient();

        this.providerInstance = this.sdk.useAirwallex(
            httpClient,
            {
                apiKey: config.apiKey,
                clientId: config.clientId,
                ...(config.baseUrl && { baseUrl: config.baseUrl }),
            },
            this.logger,
            authHttpClient,
        );

        this.logger.log('✓ Airwallex provider initialized successfully');
    }

    private async getProvider(): Promise<ProviderInstance> {
        await this.initialize();
        if (!this.providerInstance) {
            throw new ProviderNotInitializedException(ProviderType.AIRWALLEX);
        }
        return this.providerInstance;
    }

    private async refreshAuthToken(): Promise<AirwallexAuthResponse> {
        try {
            const providerInstance = await this.getProvider();
            const result = await providerInstance.authenticate();
            return result;
        } catch (error) {
            this.logger.error(
                `Failed to refresh auth token for Airwallex: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    async authenticate(userId?: string, oauthCode?: string): Promise<AirwallexAuthResponse> {
        this.logger.debug(`Authenticating with Airwallex`, { userId, hasOAuthCode: !!oauthCode });

        try {
            // For Airwallex OAuth2: Exchange code for token
            if (oauthCode) {
                return await this.exchangeOAuthCode(oauthCode);
            }

            const providerInstance = await this.getProvider();
            this.logger.debug(`Provider instance obtained, calling authenticate directly...`);

            const authResponse = await providerInstance.authenticate();
            this.logger.debug(`Authentication response received`);

            const expiresIn = authResponse.expires_in || 1800;
            const token = (authResponse as any).token || (authResponse as any).access_token;

            if (!token) {
                throw new Error('Token not found in auth response');
            }

            await this.tokenService.storeToken(ProviderType.AIRWALLEX, token, expiresIn, userId);
            this.logger.log(`Successfully authenticated with Airwallex and stored token`);

            return authResponse;
        } catch (error) {
            if (error instanceof ProviderNotInitializedException) {
                throw error;
            }

            this.logger.error(`Failed to authenticate with Airwallex: ${error.message}`, error.stack);
            throw new ProviderOperationException(ProviderType.AIRWALLEX, 'authenticate', error);
        }
    }

    async getAccount(): Promise<StandardAccount> {
        this.logger.debug(`Getting account for Airwallex`);

        try {
            const providerInstance = await this.getProvider();
            const result = await providerInstance.getAccount();
            this.logger.log(`Successfully retrieved account from Airwallex`);
            return result;
        } catch (error) {
            if (error instanceof ProviderNotInitializedException) {
                throw error;
            }

            this.logger.error(`Failed to get account from Airwallex: ${error.message}`, error.stack);
            throw new ProviderOperationException(ProviderType.AIRWALLEX, 'get account', error);
        }
    }

    async getBalances(): Promise<StandardBalance[]> {
        this.logger.debug(`Getting balances for Airwallex`);

        try {
            const providerInstance = await this.getProvider();
            const result = await providerInstance.getBalances();
            this.logger.log(`Successfully retrieved ${result.length} balances from Airwallex`);
            return result;
        } catch (error) {
            if (error instanceof ProviderNotInitializedException) {
                throw error;
            }

            this.logger.error(`Failed to get balances from Airwallex: ${error.message}`, error.stack);
            throw new ProviderOperationException(ProviderType.AIRWALLEX, 'get balances', error);
        }
    }

    async getOAuthRedirectUrl(
        userId?: string,
        action?: string,
        state?: string,
    ): Promise<{ redirectUrl: string; userId?: string; state?: string; codeVerifier?: string }> {
        this.logger.debug(`Getting OAuth redirect URL for Airwallex`);

        const config = this.configService.get<BankConfig['airwallex']>('bank.airwallex');
        if (!config?.clientId || !config?.oauthRedirectUri) {
            throw new Error(
                'Airwallex OAuth configuration is incomplete. Please configure CLIENT_ID and OAUTH_REDIRECT_URI',
            );
        }

        // Generate state if not provided (for CSRF protection)
        const oauthState = state || `state-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const scope =
            config.oauthScope ||
            'r:awx_action:balances_view r:awx_action:settings.account_details_view';

        // Generate PKCE code verifier and challenge
        const codeVerifier = crypto.randomBytes(32).toString('base64url');
        const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

        const params = new URLSearchParams({
            application: 'oauth-consent',
            response_type: 'code',
            client_id: config.clientId,
            redirect_uri: config.oauthRedirectUri,
            scope,
            state: oauthState,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
        });

        // OAuth authorization endpoint is at root domain, not API domain
        // Convert api.airwallex.com -> airwallex.com
        // Convert api-demo.airwallex.com -> demo.airwallex.com
        let oauthBaseUrl = 'https://airwallex.com';
        if (config.baseUrl) {
            // Extract domain from baseUrl
            const urlMatch = config.baseUrl.match(/https?:\/\/([^\/]+)/);
            if (urlMatch) {
                let domain = urlMatch[1];
                // Remove 'api-' prefix if present (e.g., api-demo.airwallex.com -> demo.airwallex.com)
                domain = domain.replace(/^api-/, '');
                // Remove 'api.' prefix if present (e.g., api.airwallex.com -> airwallex.com)
                domain = domain.replace(/^api\./, '');
                oauthBaseUrl = `https://${domain}`;
            }
        }

        const redirectUrl = `${oauthBaseUrl}/app/login-auth?${params.toString()}`;

        // Store code_verifier with state for later use (you might want to store this in Redis/DB)
        // For now, we'll return it so the frontend can store it
        return { redirectUrl, state: oauthState, codeVerifier };
    }

    /**
     * Exchange OAuth2 authorization code for access token
     */
    private async exchangeOAuthCode(code: string, codeVerifier?: string): Promise<AirwallexAuthResponse> {
        const config = this.configService.get<BankConfig['airwallex']>('bank.airwallex');
        if (!config?.clientId || !config?.apiKey || !config?.oauthRedirectUri) {
            throw new Error(
                'Airwallex OAuth configuration is incomplete. Please configure CLIENT_ID, CLIENT_SECRET, and OAUTH_REDIRECT_URI',
            );
        }

        const authHttpClient = this.createAuthHttpClient();
        const baseUrl = config.baseUrl || 'https://api.airwallex.com';

        // Prepare Basic Auth header
        const credentials = Buffer.from(`${config.clientId}:${config.apiKey}`).toString('base64');

        const tokenParams: Record<string, string> = {
            grant_type: 'authorization_code',
            code,
            redirect_uri: config.oauthRedirectUri,
        };

        // Add code_verifier if PKCE is used
        if (codeVerifier) {
            tokenParams.code_verifier = codeVerifier;
        }

        const response = await authHttpClient.post<AirwallexAuthResponse>(
            '/oauth/token',
            new URLSearchParams(tokenParams).toString(),
            {
                baseURL: baseUrl,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${credentials}`,
                },
            },
        );

        const authResponse = response.data;
        const expiresIn = authResponse.expires_in || 1800;
        const token = authResponse.access_token;

        if (!token) {
            throw new Error('Token not found in OAuth response');
        }

        await this.tokenService.storeToken(ProviderType.AIRWALLEX, token, expiresIn);
        this.logger.log(`Successfully exchanged OAuth code for Airwallex and stored token`);

        return authResponse;
    }
}

