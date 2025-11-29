import { Injectable, Logger } from '@nestjs/common';
import { IHttpClient } from '../../../sdk';
import { HttpRequestBuilder } from '../../../sdk/src/shared/builders/http-request.builder';
import { UrlBuilder } from '../../../sdk/src/shared/builders/url.builder';
import { BASIQ_CONSTANTS } from '../../../sdk/src/shared/constants/basiq.constants';
import { BankConfig } from '../../../config/bank.config';

@Injectable()
export class BasiqOAuth {
    private readonly logger = new Logger(BasiqOAuth.name);

    /**
     * Fetch client token from Basiq API for OAuth consent flow
     * This calls /token endpoint with scope=CLIENT_ACCESS and userId
     */
    async getClientToken(httpClient: IHttpClient, config: BankConfig['basiq'], userId: string): Promise<string> {
        this.logger.debug(`[BasiqOAuth] Fetching client token for userId: ${userId}`);

        try {
            const baseUrl = config?.baseUrl || BASIQ_CONSTANTS.BASE_URL;
            const apiKey = config?.apiKey || '';

            if (!apiKey) {
                throw new Error('Basiq apiKey is required for client token request');
            }

            const formData = new URLSearchParams();
            formData.append('scope', BASIQ_CONSTANTS.SCOPES.CLIENT_ACCESS);
            formData.append('userId', userId);

            this.logger.debug(`[BasiqOAuth] Requesting client token from ${baseUrl}/token`, {
                userId,
                scope: BASIQ_CONSTANTS.SCOPES.CLIENT_ACCESS,
            });

            const requestConfig = HttpRequestBuilder.post(BASIQ_CONSTANTS.ENDPOINTS.AUTHENTICATE, formData.toString())
                .baseUrl(baseUrl)
                .headers({
                    'Authorization': `Basic ${apiKey}`,
                    'Content-Type': BASIQ_CONSTANTS.HEADERS.CONTENT_TYPE_FORM,
                    [BASIQ_CONSTANTS.HEADERS.VERSION]: BASIQ_CONSTANTS.API_VERSION,
                })
                .build();

            const response = await httpClient.request<any>(requestConfig);

            const clientToken = response.data?.access_token || response.data?.token;
            if (!clientToken) {
                this.logger.error(`[BasiqOAuth] Client token not found in response`, {
                    responseData: response.data,
                    responseDataType: typeof response.data,
                });
                throw new Error('Client token not found in response');
            }

            this.logger.debug(`[BasiqOAuth] Client token fetched successfully`, {
                tokenLength: clientToken.length,
                tokenPreview: `${clientToken.substring(0, 30)}...`,
            });
            return clientToken;
        } catch (error: any) {
            this.logger.error(`[BasiqOAuth] Failed to fetch client token`, {
                error: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data,
                userId,
            });
            throw error;
        }
    }

    /**
     * Get OAuth redirect URL for Basiq
     */
    async getOAuthRedirectUrl(
        httpClient: IHttpClient,
        config: BankConfig['basiq'],
        userId: string,
        action: string = 'connect',
    ): Promise<{ redirectUrl: string; userId: string }> {
        this.logger.debug(`[BasiqOAuth] Getting OAuth redirect URL for Basiq`);

        this.logger.debug(`[BasiqOAuth] Fetching client token for OAuth...`);
        const clientToken = await this.getClientToken(httpClient, config, userId);
        this.logger.log(`[BasiqOAuth] Client token fetched successfully`);

        const redirectUrl = UrlBuilder.create('https://consent.basiq.io')
            .path('/home')
            .queryParams({
                userId,
                token: clientToken,
                action,
            })
            .build();

        this.logger.log(`[BasiqOAuth] Generated OAuth redirect URL: ${redirectUrl}`);
        this.logger.debug(`[BasiqOAuth] OAuth redirect URL details`, {
            userId,
            clientTokenLength: clientToken?.length,
            clientTokenPreview: clientToken ? `${clientToken.substring(0, 20)}...` : 'missing',
            action,
            redirectUrl,
        });

        return { redirectUrl, userId };
    }
}
