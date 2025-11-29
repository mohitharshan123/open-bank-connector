import { Injectable, Logger } from '@nestjs/common';
import { HttpRequestBuilder } from '../../shared/builders/http-request.builder';
import { BASIQ_CONSTANTS } from '../../shared/constants/basiq.constants';
import type { IHttpClient } from '../../shared/interfaces/https-client.interface';
import type { BasiqConfig, BasiqCreateUserRequest, BasiqUser } from '../../shared/types/basiq';

@Injectable()
export class BasiqUsers {
    private readonly logger = new Logger(BasiqUsers.name);

    /**
     * Create a Basiq user using a bearer token
     */
    async createUser(
        httpClient: IHttpClient,
        config: BasiqConfig,
        userData: BasiqCreateUserRequest,
        bearerToken: string,
    ): Promise<BasiqUser> {
        this.logger.log(`[BasiqUsers] Creating Basiq user with bearer token`, { userData });

        try {
            const baseUrl = config.baseUrl || BASIQ_CONSTANTS.BASE_URL;
            const userToCreate = {
                email: userData.email,
                mobile: userData.mobile,
                firstName: userData.firstName,
                lastName: userData.lastName,
            };

            const requestConfig = HttpRequestBuilder.post(BASIQ_CONSTANTS.ENDPOINTS.CREATE_USER, userToCreate)
                .baseUrl(baseUrl)
                .headers({
                    'Authorization': `Bearer ${bearerToken}`,
                    'Content-Type': BASIQ_CONSTANTS.HEADERS.CONTENT_TYPE_JSON,
                    [BASIQ_CONSTANTS.HEADERS.VERSION]: BASIQ_CONSTANTS.API_VERSION,
                })
                .build();

            const response = await httpClient.request<BasiqUser>(requestConfig);

            const user = response.data;
            this.logger.log(`[BasiqUsers] Basiq user created successfully`, { userId: user.id });
            return user;
        } catch (error: any) {
            this.logger.error(`[BasiqUsers] Failed to create Basiq user`, {
                error: error.message,
                status: error.response?.status,
                responseData: error.response?.data,
                requestData: userData,
            });
            if (error.response?.data) {
                this.logger.error(`[BasiqUsers] Basiq API error response:`, JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    }
}

