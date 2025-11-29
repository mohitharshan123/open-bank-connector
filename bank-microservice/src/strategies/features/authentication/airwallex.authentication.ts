import { Injectable, Logger } from '@nestjs/common';
import { ProviderNotInitializedException, ProviderOperationException } from '../../../exceptions/provider.exception';
import { AirwallexAuthResponse, ProviderInstance } from '../../../sdk';
import { TokenService } from '../../../services/token.service';
import { ProviderType } from '../../../types/provider.enum';
import { AirwallexOAuth } from '../oauth/airwallex.oauth';

@Injectable()
export class AirwallexAuthentication {
    private readonly logger = new Logger(AirwallexAuthentication.name);

    constructor(private readonly tokenService: TokenService) { }

    /**
     * Authenticate with Airwallex
     */
    async authenticate(
        providerInstance: ProviderInstance,
        oauth: AirwallexOAuth,
        companyId: string,
        userId?: string,
        oauthCode?: string,
    ): Promise<AirwallexAuthResponse> {
        this.logger.debug(`Authenticating with Airwallex`, { userId, hasOAuthCode: !!oauthCode });

        try {
            if (oauthCode) {
                throw new Error('OAuth code exchange should be handled by strategy with proper httpClient and config');
            }

            this.logger.debug(`Provider instance obtained, calling authenticate directly...`);

            const authResponse = await providerInstance.authenticate();
            this.logger.debug(`Authentication response received`);

            const expiresIn = authResponse.expires_in || 1800;
            const token = (authResponse as any).token || (authResponse as any).access_token;

            if (!token) {
                throw new Error('Token not found in auth response');
            }

            await this.tokenService.storeToken(ProviderType.AIRWALLEX, companyId, token, expiresIn, userId);
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
}

