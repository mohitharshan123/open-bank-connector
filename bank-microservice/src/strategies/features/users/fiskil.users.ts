import { Injectable, Logger } from '@nestjs/common';
import { BankConfig } from '../../../config/bank.config';
import { ProviderOperationException } from '../../../exceptions/provider.exception';
import { FiskilCreateUserRequest, FiskilCreateUserResponse, IHttpClient } from '../../../sdk';
import { FiskilUsers as SdkFiskilUsers } from '../../../sdk/src/features/users/fiskil.users';
import { TokenService } from '../../../services/token.service';
import { ProviderType } from '../../../types/provider.enum';

@Injectable()
export class FiskilUsers {
    private readonly logger = new Logger(FiskilUsers.name);
    private readonly sdkFiskilUsers: SdkFiskilUsers;

    constructor(private readonly tokenService: TokenService) {
        this.sdkFiskilUsers = new SdkFiskilUsers();
    }

    /**
     * Create an end user in Fiskil and store end_user_id in token metadata
     */
    async createUser(
        httpClient: IHttpClient,
        config: BankConfig['fiskil'],
        companyId: string,
        userData: FiskilCreateUserRequest,
    ): Promise<FiskilCreateUserResponse> {
        this.logger.debug(`Creating Fiskil end user`, { email: userData.email, name: userData.name });

        try {
            const userResponse = await this.sdkFiskilUsers.createUser(httpClient, config, userData);
            const endUserId = userResponse?.end_user_id;

            if (!endUserId) {
                throw new Error('end_user_id not found in Fiskil user creation response');
            }

            this.logger.log(`Successfully created Fiskil end user`, { end_user_id: endUserId });

            await this.storeEndUserIdInMetadata(companyId, endUserId);

            return userResponse;
        } catch (error) {
            this.logger.error(`Failed to create Fiskil end user: ${error.message}`, error.stack);
            throw new ProviderOperationException(ProviderType.FISKIL, 'createUser', error);
        }
    }

    /**
     * Store end_user_id in token metadata
     */
    private async storeEndUserIdInMetadata(companyId: string, endUserId: string): Promise<void> {
        try {
            this.logger.debug(`Attempting to store end_user_id in token metadata`, {
                companyId,
                end_user_id: endUserId
            });

            await this.tokenService.updateTokenMetadata(
                ProviderType.FISKIL,
                companyId,
                { end_user_id: endUserId },
            );

            const tokenDoc = await this.tokenService.getActiveToken(ProviderType.FISKIL, companyId);
            if (tokenDoc?.metadata?.end_user_id === endUserId) {
                this.logger.log(`Successfully stored end_user_id in token metadata`, {
                    companyId,
                    end_user_id: endUserId,
                    metadata: tokenDoc.metadata
                });
            } else {
                this.logger.warn(`end_user_id may not have been stored correctly`, {
                    companyId,
                    expected: endUserId,
                    actual: tokenDoc?.metadata?.end_user_id,
                    fullMetadata: tokenDoc?.metadata
                });
            }
        } catch (error) {
            this.logger.error(`Could not update token metadata with end_user_id: ${error.message}`, error.stack);
            throw error;
        }
    }
}

