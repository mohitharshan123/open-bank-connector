import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { BankConfig } from '../../config/bank.config';
import { AirwallexAuthResponse, IHttpClient } from '../../sdk';
import { TokenService } from '../../services/token.service';
import { ProviderType } from '../../types/provider.enum';

export class AirwallexOAuth {
    constructor(
        private readonly httpClient: IHttpClient,
        private readonly tokenService: TokenService,
        private readonly config: BankConfig['airwallex'],
        private readonly companyId: string,
        private readonly logger: Logger,
    ) { }

    /**
     * Get OAuth redirect URL for Airwallex
     */
    getOAuthRedirectUrl(
        userId?: string,
        action?: string,
        state?: string,
    ): { redirectUrl: string; userId?: string; state?: string; codeVerifier?: string } {
        this.logger.debug(`Getting OAuth redirect URL for Airwallex`);

        if (!this.config?.clientId || !this.config?.oauthRedirectUri) {
            throw new Error(
                'Airwallex OAuth configuration is incomplete. Please configure CLIENT_ID and OAUTH_REDIRECT_URI',
            );
        }

        const oauthState = state || `state-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const scope =
            this.config.oauthScope ||
            'r:awx_action:balances_view r:awx_action:settings.account_details_view';

        const codeVerifier = crypto.randomBytes(32).toString('base64url');
        const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

        const params = new URLSearchParams({
            application: 'oauth-consent',
            response_type: 'code',
            client_id: this.config.clientId,
            redirect_uri: this.config.oauthRedirectUri,
            scope,
            state: oauthState,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
        });
        let oauthBaseUrl = 'https://airwallex.com';
        if (this.config.baseUrl) {
            const urlMatch = this.config.baseUrl.match(/https?:\/\/([^\/]+)/);
            if (urlMatch) {
                let domain = urlMatch[1];
                domain = domain.replace(/^api-/, '');
                domain = domain.replace(/^api\./, '');
                oauthBaseUrl = `https://${domain}`;
            }
        }

        const redirectUrl = `${oauthBaseUrl}/app/login-auth?${params.toString()}`;

        return { redirectUrl, state: oauthState, codeVerifier };
    }

    /**
     * Exchange OAuth2 authorization code for access token
     */
    async exchangeOAuthCode(code: string, codeVerifier?: string): Promise<AirwallexAuthResponse> {
        if (!this.config?.clientId || !this.config?.apiKey || !this.config?.oauthRedirectUri) {
            throw new Error(
                'Airwallex OAuth configuration is incomplete. Please configure CLIENT_ID, CLIENT_SECRET, and OAUTH_REDIRECT_URI',
            );
        }

        const baseUrl = this.config.baseUrl || 'https://api.airwallex.com';

        const credentials = Buffer.from(`${this.config.clientId}:${this.config.apiKey}`).toString('base64');

        const tokenParams: Record<string, string> = {
            grant_type: 'authorization_code',
            code,
            redirect_uri: this.config.oauthRedirectUri,
        };

        if (codeVerifier) {
            tokenParams.code_verifier = codeVerifier;
        }

        const response = await this.httpClient.post<AirwallexAuthResponse>(
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

        await this.tokenService.storeToken(ProviderType.AIRWALLEX, this.companyId, token, expiresIn);
        this.logger.log(`Successfully exchanged OAuth code for Airwallex and stored token`);

        return authResponse;
    }
}

