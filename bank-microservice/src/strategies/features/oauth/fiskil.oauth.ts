import { Injectable, Logger } from '@nestjs/common';
import { BankConfig } from '../../../config/bank.config';
import { FiskilAuthResponse, FiskilAuthSessionResponse, IHttpClient } from '../../../sdk';
import { HttpRequestBuilder } from '../../../sdk/src/shared/builders/http-request.builder';
import { FISKIL_CONSTANTS } from '../../../sdk/src/shared/constants/fiskil.constants';
import { TokenService } from '../../../services/token.service';
import { ProviderType } from '../../../types/provider.enum';

@Injectable()
export class FiskilOAuth {
    private readonly logger = new Logger(FiskilOAuth.name);

    constructor(private readonly tokenService: TokenService) { }

    /**
     * Create auth session and get auth URL for Fiskil
     * POST /v1/auth/session with end_user_id
     */
    async createAuthSession(
        httpClient: IHttpClient,
        config: BankConfig['fiskil'],
        endUserId: string,
        cancelUri?: string,
    ): Promise<FiskilAuthSessionResponse> {
        this.logger.debug(`Creating auth session for Fiskil end_user_id: ${endUserId}`);

        if (!endUserId) {
            throw new Error('end_user_id is required to create Fiskil auth session');
        }

        const cancelUriToUse = cancelUri || config.oauthRedirectUri || 'https://www.google.com';
        const redirectUriToUse = config.oauthRedirectUri || 'https://www.google.com';

        const requestBody: { end_user_id: string; cancel_uri: string; redirect_uri: string } = {
            end_user_id: endUserId,
            cancel_uri: cancelUriToUse,
            redirect_uri: redirectUriToUse,
        };

        const requestConfig = HttpRequestBuilder.post(
            FISKIL_CONSTANTS.ENDPOINTS.CREATE_AUTH_SESSION,
            requestBody
        )
            .baseUrl(FISKIL_CONSTANTS.BASE_URL)
            .headers({
                'Content-Type': FISKIL_CONSTANTS.HEADERS.CONTENT_TYPE,
                'Accept': FISKIL_CONSTANTS.HEADERS.ACCEPT,
            })
            .build();

        const response = await httpClient.request<FiskilAuthSessionResponse>(requestConfig);

        this.logger.log(`Successfully created Fiskil auth session`, {
            session_id: response.data.session_id,
            expires_at: response.data.expires_at,
        });

        return response.data;
    }

    /**
     * Get OAuth redirect URL for Fiskil (creates auth session)
     * Returns auth session details including session_id for Link SDK
     */
    async getOAuthRedirectUrl(
        httpClient: IHttpClient,
        config: BankConfig['fiskil'],
        endUserId?: string,
        action?: string,
        state?: string,
    ): Promise<{ redirectUrl: string; userId?: string; state?: string; codeVerifier?: string; sessionId?: string; authUrl?: string; expiresAt?: string }> {
        this.logger.debug(`Getting OAuth redirect URL for Fiskil`);

        if (!endUserId) {
            throw new Error('end_user_id is required for Fiskil OAuth redirect');
        }

        const cancelUri = config.oauthRedirectUri;
        const sessionResult = await this.createAuthSession(httpClient, config, endUserId, cancelUri);

        return {
            redirectUrl: sessionResult.auth_url,
            authUrl: sessionResult.auth_url,
            sessionId: sessionResult.session_id,
            expiresAt: sessionResult.expires_at,
            userId: endUserId,
            state: state,
        };
    }

    /**
     * Exchange OAuth2 authorization code for access token
     */
    async exchangeOAuthCode(
        httpClient: IHttpClient,
        config: BankConfig['fiskil'],
        companyId: string,
        code: string,
        userId?: string,
    ): Promise<FiskilAuthResponse> {
        if (!config?.clientId || !config?.clientSecret || !config?.oauthRedirectUri) {
            throw new Error(
                'Fiskil OAuth configuration is incomplete. Please configure CLIENT_ID, CLIENT_SECRET, and OAUTH_REDIRECT_URI',
            );
        }

        const baseUrl = config.baseUrl || FISKIL_CONSTANTS.BASE_URL;
        const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

        const tokenParams = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: config.oauthRedirectUri,
        });

        const requestConfig = HttpRequestBuilder.post(
            FISKIL_CONSTANTS.ENDPOINTS.AUTHENTICATE,
            tokenParams.toString()
        )
            .baseUrl(baseUrl)
            .headers({
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                Authorization: `Basic ${credentials}`,
            })
            .build();

        const response = await httpClient.request<FiskilAuthResponse>(requestConfig);

        const authResponse = response.data;
        const expiresIn = authResponse.expires_in || 3600;
        const token = authResponse.access_token;

        if (!token) {
            throw new Error('Token not found in OAuth response');
        }

        await this.tokenService.storeToken(
            ProviderType.FISKIL,
            companyId,
            token,
            expiresIn,
            userId,
            userId ? { end_user_id: userId } : undefined,
        );
        this.logger.log(`Successfully exchanged OAuth code for Fiskil and stored token`);

        return authResponse;
    }
}

