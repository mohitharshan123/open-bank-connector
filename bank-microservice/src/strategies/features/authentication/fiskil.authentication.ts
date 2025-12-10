import { Injectable, Logger } from '@nestjs/common';
import { ProviderNotInitializedException, ProviderOperationException } from '../../../exceptions/provider.exception';
import { FiskilAuthResponse, ProviderInstance } from '../../../sdk';
import { TokenService } from '../../../services/token.service';
import { ProviderType } from '../../../types/provider.enum';
import { FiskilOAuth } from '../oauth/fiskil.oauth';

@Injectable()
export class FiskilAuthentication {
    private readonly logger = new Logger(FiskilAuthentication.name);

    constructor(private readonly tokenService: TokenService) { }

    /**
     * Authenticate with Fiskil
     */
    async authenticate(
        providerInstance: ProviderInstance,
        oauth: FiskilOAuth,
        companyId: string,
        userId?: string,
        oauthCode?: string,
    ): Promise<FiskilAuthResponse> {
        this.logger.debug(`Authenticating with Fiskil`, { userId, hasOAuthCode: !!oauthCode });

        try {
            if (oauthCode) {
                throw new Error('OAuth code exchange should be handled by strategy with proper httpClient and config');
            }

            this.logger.debug(`Provider instance obtained, calling authenticate directly...`);

            const authResponse = await providerInstance.authenticate();
            this.logger.debug(`Authentication response received`);

            const expiresIn = authResponse.expires_in || 3600;
            const token = (authResponse as any).token || (authResponse as any).access_token;

            if (!token) {
                throw new Error('Token not found in auth response');
            }

            await this.tokenService.storeToken(
                ProviderType.FISKIL,
                companyId,
                token,
                expiresIn,
                userId,
                userId ? { end_user_id: userId } : undefined,
            );
            this.logger.log(`Successfully authenticated with Fiskil and stored token`);

            return authResponse;
        } catch (error) {
            if (error instanceof ProviderNotInitializedException) {
                throw error;
            }

            this.logger.error(`Failed to authenticate with Fiskil: ${error.message}`, error.stack);
            throw new ProviderOperationException(ProviderType.FISKIL, 'authenticate', error);
        }
    }
}

