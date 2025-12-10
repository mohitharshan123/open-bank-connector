import { Injectable, Logger } from '@nestjs/common';
import type { IHttpClient } from '../../shared/interfaces/https-client.interface';
import { FISKIL_CONSTANTS } from '../../shared/constants/fiskil.constants';
import { HttpRequestBuilder } from '../../shared/builders/http-request.builder';
import type { FiskilAuthResponse, FiskilConfig } from '../../shared/types/fiskil';

@Injectable()
export class FiskilAuthentication {
    private readonly logger = new Logger(FiskilAuthentication.name);

    /**
     * Authenticate with Fiskil API to get bearer token
     * POST /v1/token with client_id and client_secret in JSON body
     */
    async authenticate(httpClient: IHttpClient, config: FiskilConfig): Promise<FiskilAuthResponse> {
        this.logger.log('[FiskilAuthentication] Starting authentication');

        try {
            const baseUrl = config.baseUrl || FISKIL_CONSTANTS.BASE_URL;
            this.logger.debug(`[FiskilAuthentication] Making authentication request to ${baseUrl}${FISKIL_CONSTANTS.ENDPOINTS.AUTHENTICATE}`);

            const requestBody = {
                client_id: config.clientId,
                client_secret: config.clientSecret,
            };

            const requestConfig = HttpRequestBuilder.post(
                FISKIL_CONSTANTS.ENDPOINTS.AUTHENTICATE,
                requestBody
            )
                .baseUrl(baseUrl)
                .headers({
                    'Content-Type': FISKIL_CONSTANTS.HEADERS.CONTENT_TYPE,
                    'Accept': FISKIL_CONSTANTS.HEADERS.ACCEPT,
                })
                .build();

            const response = await httpClient.request<FiskilAuthResponse>(requestConfig);

            this.logger.log('[FiskilAuthentication] Authentication successful', {
                hasAccessToken: !!response.data?.access_token,
            });

            return response.data;
        } catch (error: any) {
            this.logger.error(`[FiskilAuthentication] Authentication failed`, {
                error: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data,
            });
            throw new Error(`Fiskil authentication failed: ${error.message || 'Unknown error'}`);
        }
    }
}

