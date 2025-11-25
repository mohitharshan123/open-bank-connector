import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AirwallexAuthResponse } from '../sdk';
import { RedisConfig } from '../config/redis.config';
import { REDIS_CLIENT } from '../modules/redis.module';
import type { ITokenRepository } from '../repositories/token.repository.interface';
import { TokenRepository } from '../repositories/token.repository.interface';
import type { TokenDocument, BasiqTokenDocument, AirwallexTokenDocument } from '../schemas/token.schema';
import { isBasiqToken, isAirwallexToken } from '../schemas/token.schema';
import { ProviderType } from '../types/provider.enum';

interface TokenData {
    token: string;
    refreshToken?: string;
    expiresAt: number;
    userId?: string;
}

@Injectable()
export class TokenService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(TokenService.name);
    private readonly keyPrefix: string;
    private readonly refreshLocks: Map<ProviderType, Promise<string>> = new Map();

    constructor(
        @Inject(REDIS_CLIENT) private readonly redis: Redis,
        @Inject(TokenRepository) private readonly tokenRepository: ITokenRepository,
        private readonly configService: ConfigService,
    ) {
        const redisConfig = this.configService.get<RedisConfig>('redis');
        this.keyPrefix = redisConfig?.keyPrefix || 'bank:token:';
    }

    async onModuleInit() {
        this.logger.log('TokenService initialized with Redis');
    }

    async onModuleDestroy() {
        await this.redis.quit();
    }

    async getValidToken(
        provider: ProviderType,
        refreshCallback: () => Promise<AirwallexAuthResponse>,
    ): Promise<string> {
        const redisKey = this.getRedisKey(provider);
        const cachedToken = await this.getTokenFromRedis(redisKey);

        if (cachedToken && this.isTokenValid(cachedToken.expiresAt)) {
            this.logger.debug(
                `Using cached token from Redis for ${provider} (expires at ${new Date(cachedToken.expiresAt).toISOString()})`,
            );
            return cachedToken.token;
        }

        const existingRefresh = this.refreshLocks.get(provider);
        if (existingRefresh) {
            this.logger.debug(`Refresh already in progress for ${provider}, waiting...`);
            try {
                return await existingRefresh;
            } catch (error) {
                this.logger.warn(`Existing refresh promise failed, retrying: ${error.message}`);
                this.refreshLocks.delete(provider);
            }
        }

        this.logger.log(`Token expired or not found for ${provider}, refreshing...`);
        const refreshPromise = this.refreshToken(provider, refreshCallback)
            .finally(() => {
                this.refreshLocks.delete(provider);
                this.logger.debug(`Refresh lock released for ${provider}`);
            });

        this.refreshLocks.set(provider, refreshPromise);
        return refreshPromise;
    }

    async getActiveToken(provider: ProviderType): Promise<TokenDocument | null> {
        const redisKey = this.getRedisKey(provider);
        const cachedToken = await this.getTokenFromRedis(redisKey);

        if (cachedToken) {
            if (provider === ProviderType.BASIQ && !cachedToken.userId) {
                const mongoToken = await this.tokenRepository.findActiveByProvider(provider);
                if (mongoToken && isBasiqToken(mongoToken)) {
                    cachedToken.userId = mongoToken.userId;
                    await this.setTokenInRedis(redisKey, cachedToken, Math.floor((cachedToken.expiresAt - Date.now()) / 1000));
                }
            }

            const tokenDoc = await this.tokenRepository.findActiveByProvider(provider);
            if (tokenDoc) {
                return tokenDoc;
            }

            return null;
        }

        return this.tokenRepository.findActiveByProvider(provider);
    }

    private isTokenValid(expiresAt: Date | number): boolean {
        const bufferTime = 5 * 60 * 1000;
        const expiryTime = typeof expiresAt === 'number' ? expiresAt : expiresAt.getTime();
        return new Date(expiryTime - bufferTime) > new Date();
    }

    private getRedisKey(provider: ProviderType): string {
        return `${this.keyPrefix}${provider}`;
    }

    private async getTokenFromRedis(key: string): Promise<TokenData | null> {
        try {
            const data = await this.redis.get(key);
            if (!data) {
                return null;
            }
            return JSON.parse(data) as TokenData;
        } catch (error) {
            this.logger.warn(`Failed to get token from Redis: ${error.message}`);
            return null;
        }
    }

    private async setTokenInRedis(
        key: string,
        tokenData: TokenData,
        ttlSeconds: number,
    ): Promise<void> {
        try {
            await this.redis.setex(key, ttlSeconds, JSON.stringify(tokenData));
        } catch (error) {
            this.logger.error(`Failed to store token in Redis: ${error.message}`);
            throw error;
        }
    }

    async refreshToken(
        provider: ProviderType,
        refreshCallback: () => Promise<AirwallexAuthResponse>,
    ): Promise<string> {
        try {
            await this.deactivateTokens(provider);

            this.logger.debug(`Calling refresh callback for ${provider}...`);

            let authResponse: AirwallexAuthResponse;
            try {
                authResponse = await refreshCallback();
            } catch (callbackError) {
                this.logger.error(
                    `Refresh callback failed for ${provider}: ${callbackError.message}`,
                    callbackError.stack,
                );
                throw callbackError;
            }

            if (!authResponse) {
                throw new Error('Auth response is empty');
            }

            this.logger.debug(`Refresh callback succeeded, got auth response`);

            const expiresIn = authResponse.expires_in || 1800;
            const expiresAtMs = Date.now() + expiresIn * 1000;
            const expiresAt = new Date(expiresAtMs);

            const token = (authResponse as any).token || (authResponse as any).access_token;
            if (!token) {
                throw new Error('Token not found in auth response');
            }

            const redisKey = this.getRedisKey(provider);

            const existingToken = await this.tokenRepository.findActiveByProvider(provider);
            const userId = existingToken && isBasiqToken(existingToken) ? existingToken.userId : undefined;

            const tokenData: TokenData = {
                token,
                expiresAt: expiresAtMs,
                userId,
            };

            await this.setTokenInRedis(redisKey, tokenData, expiresIn + 60);

            await this.tokenRepository.create({
                provider,
                token,
                userId,
                expiresAt,
                isActive: true,
                metadata: this.getProviderMetadata(provider, authResponse),
            });

            this.logger.log(
                `Successfully refreshed token for ${provider} (expires at ${expiresAt.toISOString()}) - stored in Redis and MongoDB`,
            );

            return token;
        } catch (error) {
            this.logger.error(
                `Failed to refresh token for ${provider}: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    async deactivateTokens(provider: ProviderType): Promise<void> {
        const modifiedCount = await this.tokenRepository.deactivateByProvider(provider);

        if (modifiedCount > 0) {
            this.logger.debug(
                `Deactivated ${modifiedCount} token(s) for ${provider}`,
            );
        }
    }

    async storeToken(
        provider: ProviderType,
        token: string,
        expiresIn: number,
        userId?: string,
    ): Promise<TokenDocument> {
        await this.deactivateTokens(provider);

        const expiresAtMs = Date.now() + expiresIn * 1000;
        const expiresAt = new Date(expiresAtMs);

        const redisKey = this.getRedisKey(provider);
        const tokenData: TokenData = {
            token,
            expiresAt: expiresAtMs,
            userId, 
        };
        await this.setTokenInRedis(redisKey, tokenData, expiresIn + 60);

        return this.tokenRepository.create({
            provider,
            token,
            userId,
            expiresAt,
            isActive: true,
            metadata: this.getProviderMetadataForManualStorage(provider),
        });
    }

    async getTokenInfo(provider: ProviderType): Promise<{
        hasToken: boolean;
        expiresAt?: Date;
        isValid: boolean;
    }> {
        const redisKey = this.getRedisKey(provider);
        const cachedToken = await this.getTokenFromRedis(redisKey);

        if (cachedToken) {
            return {
                hasToken: true,
                expiresAt: new Date(cachedToken.expiresAt),
                isValid: this.isTokenValid(cachedToken.expiresAt),
            };
        }

        const token = await this.tokenRepository.findActiveByProvider(provider);

        if (!token) {
            return {
                hasToken: false,
                isValid: false,
            };
        }

        return {
            hasToken: true,
            expiresAt: token.expiresAt,
            isValid: this.isTokenValid(token.expiresAt),
        };
    }

    async deleteTokens(provider: ProviderType): Promise<void> {
        const redisKey = this.getRedisKey(provider);
        await this.redis.del(redisKey);

        const deletedCount = await this.tokenRepository.deleteByProvider(provider);
        this.logger.log(`Deleted token(s) for ${provider} from Redis and MongoDB (${deletedCount} MongoDB records)`);
    }

    private getProviderMetadata(
        provider: ProviderType,
        authResponse: AirwallexAuthResponse,
    ): Record<string, any> | undefined {
        switch (provider) {
            case ProviderType.AIRWALLEX:
                const airwallexConfig = this.configService.get<{
                    apiKey: string;
                    clientId: string;
                }>('bank.airwallex');

                return {
                    clientId: airwallexConfig?.clientId,
                    apiKey: airwallexConfig?.apiKey,
                    scope: (authResponse as any).scope,
                };
            default:
                return undefined;
        }
    }

    private getProviderMetadataForManualStorage(
        provider: ProviderType,
    ): Record<string, any> | undefined {
        switch (provider) {
            case ProviderType.AIRWALLEX:
                const airwallexConfig = this.configService.get<{
                    apiKey: string;
                    clientId: string;
                }>('bank.airwallex');

                return {
                    clientId: airwallexConfig?.clientId,
                    apiKey: airwallexConfig?.apiKey,
                };
            default:
                return undefined;
        }
    }
}

