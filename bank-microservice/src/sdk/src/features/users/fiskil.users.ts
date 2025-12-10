import { Injectable, Logger } from '@nestjs/common';
import type { IHttpClient } from '../../shared/interfaces/https-client.interface';
import { FISKIL_CONSTANTS } from '../../shared/constants/fiskil.constants';
import { HttpRequestBuilder } from '../../shared/builders/http-request.builder';
import type { FiskilConfig, FiskilCreateUserRequest, FiskilCreateUserResponse } from '../../shared/types/fiskil';

@Injectable()
export class FiskilUsers {
    private readonly logger = new Logger(FiskilUsers.name);

    /**
     * Create a new end user in Fiskil
     * POST /v1/end-users with Bearer token
     */
    async createUser(
        httpClient: IHttpClient,
        config: FiskilConfig,
        userData: FiskilCreateUserRequest,
    ): Promise<FiskilCreateUserResponse> {
        this.logger.log('[FiskilUsers] Creating end user', { email: userData.email, name: userData.name });

        try {
            const baseUrl = config.baseUrl || FISKIL_CONSTANTS.BASE_URL;

            const requestBody: FiskilCreateUserRequest = {};
            if (userData.email) requestBody.email = userData.email;
            if (userData.name) requestBody.name = userData.name;
            if (userData.phone) requestBody.phone = userData.phone;

            const requestConfig = HttpRequestBuilder.post(
                FISKIL_CONSTANTS.ENDPOINTS.CREATE_END_USER,
                requestBody
            )
                .baseUrl(baseUrl)
                .headers({
                    'Content-Type': FISKIL_CONSTANTS.HEADERS.CONTENT_TYPE,
                    'Accept': FISKIL_CONSTANTS.HEADERS.ACCEPT,
                })
                .build();

            const response = await httpClient.request<FiskilCreateUserResponse>(requestConfig);

            this.logger.log('[FiskilUsers] End user created successfully', {
                end_user_id: response.data?.end_user_id,
            });

            return response.data;
        } catch (error: any) {
            this.logger.error(`[FiskilUsers] Failed to create end user`, {
                error: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data,
            });
            throw new Error(`Fiskil end user creation failed: ${error.message || 'Unknown error'}`);
        }
    }
}

