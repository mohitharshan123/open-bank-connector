import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BankConfig } from '../config/bank.config';
import {
    ProviderNotInitializedException,
    ProviderOperationException,
} from '../exceptions/provider.exception';
import { isBasiqToken } from '../schemas/token.schema';
import {
    AirwallexAuthResponse,
    BasiqCreateUserRequest,
    BasiqUser,
    IHttpClient,
    OpenBankSDK,
    ProviderInstance,
    StandardAccount,
    StandardBalance,
} from '../sdk';
import { TokenService } from '../services/token.service';
import { ProviderType } from '../types/provider.enum';
import { NestJsHttpAdapter } from '../utils/nestjs-http-adapter';
import { TokenInjectingHttpClient } from '../utils/token-injecting-http-client';
import { IProviderStrategy } from './provider-strategy.interface';

@Injectable()
export class BasiqStrategy implements IProviderStrategy {
    private readonly logger = new Logger(BasiqStrategy.name);
    private providerInstance: ProviderInstance | null = null;
    private initializationPromise: Promise<void> | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly tokenService: TokenService,
        private readonly httpService: HttpService,
        private readonly sdk: OpenBankSDK,
    ) { }

    getProviderType(): ProviderType {
        return ProviderType.BASIQ;
    }

    private createHttpClient(): IHttpClient {
        const baseClient = new NestJsHttpAdapter(this.httpService);
        return new TokenInjectingHttpClient(
            baseClient,
            ProviderType.BASIQ,
            this.tokenService,
            () => this.refreshAuthToken(),
        );
    }

    private createAuthHttpClient(): IHttpClient {
        return new NestJsHttpAdapter(this.httpService);
    }

    /**
     * Fetch client token from Basiq API for OAuth consent flow
     * This calls /token endpoint with scope=CLIENT_ACCESS and userId
     */
    private async getClientToken(userId: string): Promise<string> {
        this.logger.debug(`[BasiqStrategy] Fetching client token for userId: ${userId}`);

        try {
            const config = this.configService.get<BankConfig['basiq']>('bank.basiq');
            const baseUrl = config?.baseUrl || 'https://au-api.basiq.io';
            const apiKey = config?.apiKey || '';

            if (!apiKey) {
                throw new Error('Basiq apiKey is required for client token request');
            }

            const authHttpClient = this.createAuthHttpClient();

            const authHeader = `Basic ${apiKey}`;

            const formData = new URLSearchParams();
            formData.append('scope', 'CLIENT_ACCESS');
            formData.append('userId', userId);

            this.logger.debug(`[BasiqStrategy] Requesting client token from ${baseUrl}/token`, {
                userId,
                scope: 'CLIENT_ACCESS',
            });

            const response = await authHttpClient.post<any>(
                '/token',
                formData.toString(),
                {
                    baseURL: baseUrl,
                    headers: {
                        'Authorization': authHeader,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'basiq-version': '3.0',
                    },
                }
            );

            const clientToken = response.data?.access_token || response.data?.token;
            if (!clientToken) {
                this.logger.error(`[BasiqStrategy] Client token not found in response`, {
                    responseData: response.data,
                    responseDataType: typeof response.data,
                });
                throw new Error('Client token not found in response');
            }

            this.logger.debug(`[BasiqStrategy] Client token fetched successfully`, {
                tokenLength: clientToken.length,
                tokenPreview: `${clientToken.substring(0, 30)}...`,
            });
            return clientToken;
        } catch (error: any) {
            this.logger.error(`[BasiqStrategy] Failed to fetch client token`, {
                error: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data,
                userId,
            });
            throw error;
        }
    }

    private async initialize(): Promise<void> {
        this.logger.debug(`[BasiqStrategy] initialize() called`);
        if (this.providerInstance) {
            this.logger.debug(`[BasiqStrategy] Provider already initialized`);
            return;
        }

        if (this.initializationPromise) {
            this.logger.debug(`[BasiqStrategy] Initialization in progress, waiting...`);
            await this.initializationPromise;
            return;
        }

        this.logger.debug(`[BasiqStrategy] Starting initialization...`);
        this.initializationPromise = this.doInitialize();
        try {
            await this.initializationPromise;
            this.logger.debug(`[BasiqStrategy] Initialization completed`);
        } catch (error) {
            this.logger.error(`[BasiqStrategy] Initialization failed: ${error.message}`, error.stack);
            throw error;
        } finally {
            this.initializationPromise = null;
        }
    }

    private async doInitialize(): Promise<void> {
        this.logger.debug(`[BasiqStrategy] doInitialize() called`);
        const config = this.configService.get<BankConfig['basiq']>('bank.basiq');

        if (!config?.apiKey) {
            throw new ProviderNotInitializedException(
                'Basiq credentials not found. Please configure BASIQ_API_KEY and BASIQ_CLIENT_ID.',
            );
        }

        this.logger.debug(`[BasiqStrategy] Creating HTTP clients...`);
        const httpClient = this.createHttpClient();
        const authHttpClient = this.createAuthHttpClient();
        this.logger.debug(`[BasiqStrategy] HTTP clients created`);

        this.logger.debug(`[BasiqStrategy] Calling sdk.useBasiq()...`);
        this.providerInstance = this.sdk.useBasiq(
            httpClient,
            {
                apiKey: config.apiKey,
                ...(config.baseUrl && { baseUrl: config.baseUrl }),
            },
            this.logger,
            authHttpClient,
        );
        this.logger.debug(`[BasiqStrategy] sdk.useBasiq() completed`);

        this.logger.log('✓ Basiq provider initialized successfully');
    }

    private async getProvider(): Promise<ProviderInstance> {
        this.logger.debug(`[BasiqStrategy] getProvider() called`);
        try {
            await this.initialize();
            this.logger.debug(`[BasiqStrategy] Initialization complete, checking provider instance...`);
            if (!this.providerInstance) {
                this.logger.error(`[BasiqStrategy] Provider instance is null after initialization`);
                throw new ProviderNotInitializedException(ProviderType.BASIQ);
            }
            this.logger.debug(`[BasiqStrategy] Provider instance obtained successfully`);
            return this.providerInstance;
        } catch (error) {
            this.logger.error(`[BasiqStrategy] getProvider() failed: ${error.message}`, error.stack);
            throw error;
        }
    }

    private async refreshAuthToken(): Promise<AirwallexAuthResponse> {
        try {
            const providerInstance = await this.getProvider();
            const result = await providerInstance.authenticate();
            return result;
        } catch (error) {
            this.logger.error(
                `Failed to refresh auth token for Basiq: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    async authenticate(userId?: string, oauthCode?: string): Promise<AirwallexAuthResponse & { redirectUrl?: string }> {
        this.logger.debug(`[BasiqStrategy] Authenticating with Basiq`, { userId });

        try {
            this.logger.debug(`[BasiqStrategy] Getting provider instance...`);
            const providerInstance = await this.getProvider();
            this.logger.debug(`[BasiqStrategy] Provider instance obtained, calling authenticate to get bearer token...`);

            const authResponse = await (providerInstance as any).authenticate(userId);
            this.logger.debug(`[BasiqStrategy] Authentication response received`);

            const expiresIn = authResponse.expires_in || 1800;
            const token = (authResponse as any).token || (authResponse as any).access_token;

            if (!token) {
                this.logger.error(`[BasiqStrategy] Token not found in auth response`, {
                    authResponseKeys: Object.keys(authResponse),
                    authResponse,
                });
                throw new Error('Token not found in auth response');
            }

            this.logger.debug(`[BasiqStrategy] Storing bearer token`, {
                tokenLength: token.length,
                tokenPreview: `${token.substring(0, 30)}...`,
                expiresIn,
            });

            if ((authResponse as any).userId) {
                userId = (authResponse as any).userId;
                this.logger.log(`Basiq userId extracted from auth response: ${userId}`);
            }

            if (!userId) {
                this.logger.log('[BasiqStrategy] Creating user...');
                const userData = {
                    email: `user-${Date.now()}@example.com`,
                    firstName: 'User',
                    lastName: `${Date.now()}`,
                };
                this.logger.debug(`[BasiqStrategy] User data for creation`, { userData });
                const user = await this.createUser(userData);
                userId = user.id;
                this.logger.log(`[BasiqStrategy] Created user ${userId}`);
            }

            await this.tokenService.storeToken(ProviderType.BASIQ, token, expiresIn, userId);
            this.logger.log(
                `Successfully authenticated with Basiq and stored token with userId: ${userId}`,
            );

            this.logger.debug(`[BasiqStrategy] Fetching client token for OAuth...`);
            const clientToken = await this.getClientToken(userId);
            this.logger.log(`[BasiqStrategy] Client token fetched successfully`);

            const redirectUrl = `https://consent.basiq.io/home?userId=${userId}&token=${clientToken}&action=connect`;
            this.logger.log(`[BasiqStrategy] Generated OAuth redirect URL: ${redirectUrl}`);
            this.logger.debug(`[BasiqStrategy] OAuth redirect URL details`, {
                userId,
                clientTokenLength: clientToken?.length,
                clientTokenPreview: clientToken ? `${clientToken.substring(0, 20)}...` : 'missing',
                redirectUrl,
            });

            return {
                ...authResponse,
                redirectUrl,
            };
        } catch (error) {
            if (error instanceof ProviderNotInitializedException) {
                throw error;
            }

            this.logger.error(`Failed to authenticate with Basiq: ${error.message}`, error.stack);
            throw new ProviderOperationException(ProviderType.BASIQ, 'authenticate', error);
        }
    }

    async getAccount(): Promise<StandardAccount> {
        this.logger.debug(`Getting account for Basiq`);

        try {
            const providerInstance = await this.getProvider();

            const tokenDoc = await this.tokenService.getActiveToken(ProviderType.BASIQ);
            if (!tokenDoc || !isBasiqToken(tokenDoc)) {
                throw new Error('Basiq token not found or invalid. Please authenticate first.');
            }

            this.logger.debug(`[BasiqStrategy] Retrieved token doc for getAccount`, {
                hasTokenDoc: !!tokenDoc,
                userId: tokenDoc.userId,
                tokenDocKeys: Object.keys(tokenDoc),
            });

            const userId = tokenDoc.userId;
            if (!userId) {
                this.logger.error(`[BasiqStrategy] userId not found in token doc`, {
                    tokenDoc,
                });
                throw new Error('Basiq userId not found. Please authenticate first to create a user.');
            }

            const result = await providerInstance.getAccount(userId);
            this.logger.log(`Successfully retrieved account from Basiq`);
            return result;
        } catch (error) {
            if (error instanceof ProviderNotInitializedException) {
                throw error;
            }

            this.logger.error(`Failed to get account from Basiq: ${error.message}`, error.stack);
            throw new ProviderOperationException(ProviderType.BASIQ, 'get account', error);
        }
    }

    async getBalances(): Promise<StandardBalance[]> {
        this.logger.debug(`Getting balances for Basiq`);

        try {
            const providerInstance = await this.getProvider();

            // Get userId from token for Basiq
            const tokenDoc = await this.tokenService.getActiveToken(ProviderType.BASIQ);
            if (!tokenDoc || !isBasiqToken(tokenDoc)) {
                throw new Error('Basiq token not found or invalid. Please authenticate first.');
            }
            const userId = tokenDoc.userId;
            if (!userId) {
                throw new Error('Basiq userId not found. Please create a user first.');
            }

            const result = await providerInstance.getBalances(userId);
            this.logger.log(`Successfully retrieved ${result.length} balances from Basiq`);
            return result;
        } catch (error) {
            if (error instanceof ProviderNotInitializedException) {
                throw error;
            }

            this.logger.error(`Failed to get balances from Basiq: ${error.message}`, error.stack);
            throw new ProviderOperationException(ProviderType.BASIQ, 'get balances', error);
        }
    }

    async getOAuthRedirectUrl(
        userId?: string,
        action: string = 'connect',
        state?: string,
    ): Promise<{ redirectUrl: string; userId?: string; state?: string; codeVerifier?: string }> {
        this.logger.debug(`Getting OAuth redirect URL for Basiq`);

        // Step 1: Authenticate first to get bearer token
        this.logger.log('[BasiqStrategy] Authenticating to get bearer token...');

        let tokenDoc = await this.tokenService.getActiveToken(ProviderType.BASIQ);
        if (!tokenDoc?.token) {
            // Authenticate without userId first to get token
            await this.authenticate();
            tokenDoc = await this.tokenService.getActiveToken(ProviderType.BASIQ);
            if (!tokenDoc?.token) {
                throw new Error('Failed to get Basiq token for OAuth redirect');
            }
        }

        // Step 2: Create user if needed (using bearer token)
        if (!userId) {
            this.logger.log('[BasiqStrategy] Creating user...');
            const user = await this.createUser({
                email: `user-${Date.now()}@example.com`,
            });
            userId = user.id;
            this.logger.log(`[BasiqStrategy] Created user ${userId} for OAuth`);
        }

        // Step 3: Fetch client token for OAuth consent flow
        this.logger.debug(`[BasiqStrategy] Fetching client token for OAuth...`);
        const clientToken = await this.getClientToken(userId);
        this.logger.log(`[BasiqStrategy] Client token fetched successfully`);

        const redirectUrl = `https://consent.basiq.io/home?userId=${userId}&token=${clientToken}&action=${action}`;

        this.logger.log(`[BasiqStrategy] Generated OAuth redirect URL: ${redirectUrl}`);
        this.logger.debug(`[BasiqStrategy] OAuth redirect URL details`, {
            userId,
            clientTokenLength: clientToken?.length,
            clientTokenPreview: clientToken ? `${clientToken.substring(0, 20)}...` : 'missing',
            action,
            redirectUrl,
        });

        return { redirectUrl, userId };
    }

    /**
     * Create a Basiq user
     */
    private async createUser(userData: BasiqCreateUserRequest): Promise<BasiqUser> {
        this.logger.log('[BasiqStrategy] Creating Basiq user', { userData });

        try {
            const providerInstance = await this.getProvider();

            if (typeof (providerInstance as any).createUser !== 'function') {
                throw new Error('Basiq provider does not support createUser');
            }

            const user = await (providerInstance as any).createUser(userData);
            this.logger.log(`Successfully created Basiq user: ${user.id}`);
            return user;
        } catch (error: any) {
            this.logger.error(
                `[BasiqStrategy] Failed to create Basiq user: ${error?.message || 'Unknown error'}`,
                error?.stack,
            );

            if (error instanceof ProviderNotInitializedException) {
                throw error;
            }

            throw new ProviderOperationException(ProviderType.BASIQ, 'create user', error);
        }
    }
}

