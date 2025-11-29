import { Logger } from '@nestjs/common';
import { IHttpClient } from '../../sdk';
import { ProviderType } from '../../types/provider.enum';
import { BankConfig } from '../../config/bank.config';

export class BasiqOAuth {
    constructor(
        private readonly httpClient: IHttpClient,
        private readonly config: BankConfig['basiq'],
        private readonly logger: Logger,
    ) { }

    /**
     * Fetch client token from Basiq API for OAuth consent flow
     * This calls /token endpoint with scope=CLIENT_ACCESS and userId
     */
    async getClientToken(userId: string): Promise<string> {
        this.logger.debug(`[BasiqOAuth] Fetching client token for userId: ${userId}`);

        try {
            const baseUrl = this.config?.baseUrl || 'https://au-api.basiq.io';
            const apiKey = this.config?.apiKey || '';

            if (!apiKey) {
                throw new Error('Basiq apiKey is required for client token request');
            }

            const authHeader = `Basic ${apiKey}`;

            const formData = new URLSearchParams();
            formData.append('scope', 'CLIENT_ACCESS');
            formData.append('userId', userId);

            this.logger.debug(`[BasiqOAuth] Requesting client token from ${baseUrl}/token`, {
                userId,
                scope: 'CLIENT_ACCESS',
            });

            const response = await this.httpClient.post<any>(
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
        userId: string,
        action: string = 'connect',
    ): Promise<{ redirectUrl: string; userId: string }> {
        this.logger.debug(`[BasiqOAuth] Getting OAuth redirect URL for Basiq`);

        this.logger.debug(`[BasiqOAuth] Fetching client token for OAuth...`);
        const clientToken = await this.getClientToken(userId);
        this.logger.log(`[BasiqOAuth] Client token fetched successfully`);

        const redirectUrl = `https://consent.basiq.io/home?userId=${userId}&token=${clientToken}&action=${action}`;

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

