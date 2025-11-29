import { Injectable, Logger } from '@nestjs/common';
import { ProviderNotInitializedException, ProviderOperationException } from '../../../exceptions/provider.exception';
import { AirwallexAuthResponse, ProviderInstance } from '../../../sdk';
import { TokenService } from '../../../services/token.service';
import { ProviderType } from '../../../types/provider.enum';
import { BasiqOAuth } from '../oauth/basiq.oauth';

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

            const authResponse = await providerInstance.authenticate(userId);
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

            const finalUserId = (authResponse as any).userId || userId;
            if (!finalUserId) {
                throw new Error('userId is required but not found in auth response');
            }

            this.logger.debug(`[BasiqAuthentication] Storing bearer token`, {
                tokenLength: token.length,
                tokenPreview: `${token.substring(0, 30)}...`,
                expiresIn,
                userId: finalUserId,
            });

            await this.tokenService.storeToken(ProviderType.BASIQ, companyId, token, expiresIn, finalUserId);
            this.logger.log(
                `Successfully authenticated with Basiq and stored token with userId: ${finalUserId}`,
            );

            return authResponse;
        } catch (error) {
            if (error instanceof ProviderNotInitializedException) {
                throw error;
            }

            this.logger.error(`Failed to authenticate with Basiq: ${error.message}`, error.stack);
            throw new ProviderOperationException(ProviderType.BASIQ, 'authenticate', error);
        }
    }

}

