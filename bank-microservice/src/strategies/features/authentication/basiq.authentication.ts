import { Injectable, Logger } from '@nestjs/common';
import { ProviderNotInitializedException, ProviderOperationException } from '../../../exceptions/provider.exception';
import { AirwallexAuthResponse, BasiqCreateUserRequest, BasiqUser, ProviderInstance } from '../../../sdk';
import { TokenService } from '../../../services/token.service';
import { ProviderType } from '../../../types/provider.enum';
import { BasiqOAuth } from '../../oauth/basiq.oauth';

@Injectable()
export class BasiqAuthentication {
    private readonly logger = new Logger(BasiqAuthentication.name);

    constructor(private readonly tokenService: TokenService) { }

    /**
     * Authenticate with Basiq
     */
    async authenticate(
        providerInstance: ProviderInstance,
        oauth: BasiqOAuth,
        companyId: string,
        userId?: string,
    ): Promise<AirwallexAuthResponse & { redirectUrl?: string }> {
        this.logger.debug(`[BasiqAuthentication] Authenticating with Basiq`, { userId });

        try {
            this.logger.debug(`[BasiqAuthentication] Getting provider instance...`);
            this.logger.debug(`[BasiqAuthentication] Provider instance obtained, calling authenticate to get bearer token...`);

            const authResponse = await (providerInstance as any).authenticate(userId);
            this.logger.debug(`[BasiqAuthentication] Authentication response received`);

            const expiresIn = authResponse.expires_in || 1800;
            const token = (authResponse as any).token || (authResponse as any).access_token;

            if (!token) {
                this.logger.error(`[BasiqAuthentication] Token not found in auth response`, {
                    authResponseKeys: Object.keys(authResponse),
                    authResponse,
                });
                throw new Error('Token not found in auth response');
            }

            this.logger.debug(`[BasiqAuthentication] Storing bearer token`, {
                tokenLength: token.length,
                tokenPreview: `${token.substring(0, 30)}...`,
                expiresIn,
            });

            if ((authResponse as any).userId) {
                userId = (authResponse as any).userId;
                this.logger.log(`Basiq userId extracted from auth response: ${userId}`);
            }

            if (!userId) {
                this.logger.log('[BasiqAuthentication] Creating user...');
                const userData: BasiqCreateUserRequest = {
                    email: `user-${Date.now()}@example.com`,
                    firstName: 'User',
                    lastName: `${Date.now()}`,
                };
                this.logger.debug(`[BasiqAuthentication] User data for creation`, { userData });
                const user = await this.createUser(providerInstance, userData);
                userId = user.id;
                this.logger.log(`[BasiqAuthentication] Created user ${userId}`);
            }

            await this.tokenService.storeToken(ProviderType.BASIQ, companyId, token, expiresIn, userId);
            this.logger.log(
                `Successfully authenticated with Basiq and stored token with userId: ${userId}`,
            );

            this.logger.debug(`[BasiqAuthentication] Fetching client token for OAuth...`);
            const { redirectUrl } = await oauth.getOAuthRedirectUrl(userId);
            this.logger.log(`[BasiqAuthentication] Client token fetched successfully`);

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

    /**
     * Create a Basiq user
     */
    private async createUser(providerInstance: ProviderInstance, userData: BasiqCreateUserRequest): Promise<BasiqUser> {
        this.logger.log('[BasiqAuthentication] Creating Basiq user', { userData });

        try {
            if (typeof (providerInstance as any).createUser !== 'function') {
                throw new Error('Basiq provider does not support createUser');
            }

            const user = await (providerInstance as any).createUser(userData);
            this.logger.log(`Successfully created Basiq user: ${user.id}`);
            return user;
        } catch (error: any) {
            this.logger.error(
                `[BasiqAuthentication] Failed to create Basiq user: ${error?.message || 'Unknown error'}`,
                error?.stack,
            );

            if (error instanceof ProviderNotInitializedException) {
                throw error;
            }

            throw new ProviderOperationException(ProviderType.BASIQ, 'create user', error);
        }
    }
}

