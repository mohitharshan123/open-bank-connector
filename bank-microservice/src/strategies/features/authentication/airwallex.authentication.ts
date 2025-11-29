import { Logger } from '@nestjs/common';
import { ProviderNotInitializedException, ProviderOperationException } from '../../../exceptions/provider.exception';
import { AirwallexAuthResponse, ProviderInstance } from '../../../sdk';
import { TokenService } from '../../../services/token.service';
import { ProviderType } from '../../../types/provider.enum';
import { AirwallexOAuth } from '../../oauth/airwallex.oauth';

export class AirwallexAuthentication {
    constructor(
        private readonly providerInstance: ProviderInstance,
        private readonly tokenService: TokenService,
        private readonly oauth: AirwallexOAuth,
        private readonly companyId: string,
        private readonly logger: Logger,
    ) { }

    /**
     * Authenticate with Airwallex
     */
    async authenticate(userId?: string, oauthCode?: string): Promise<AirwallexAuthResponse> {
        this.logger.debug(`Authenticating with Airwallex`, { userId, hasOAuthCode: !!oauthCode });

        try {
            // For Airwallex OAuth2: Exchange code for token
            if (oauthCode) {
                return await this.oauth.exchangeOAuthCode(oauthCode);
            }

            this.logger.debug(`Provider instance obtained, calling authenticate directly...`);

            const authResponse = await this.providerInstance.authenticate();
            this.logger.debug(`Authentication response received`);

            const expiresIn = authResponse.expires_in || 1800;
            const token = (authResponse as any).token || (authResponse as any).access_token;

            if (!token) {
                throw new Error('Token not found in auth response');
            }

            await this.tokenService.storeToken(ProviderType.AIRWALLEX, this.companyId, token, expiresIn, userId);
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

