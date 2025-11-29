import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisConfig } from '../config/redis.config';
import { REDIS_CLIENT } from '../modules/redis.module';
import type { ITokenRepository } from '../repositories/token.repository.interface';
import { TokenRepository } from '../repositories/token.repository.interface';
import type { TokenDocument } from '../schemas/token.schema';
import { isBasiqToken } from '../schemas/token.schema';
import { AirwallexAuthResponse } from '../sdk';
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
        companyId: string,
        refreshCallback: () => Promise<AirwallexAuthResponse>,
    ): Promise<string> {
        const redisKey = this.getRedisKey(provider, companyId);
        const cachedToken = await this.getTokenFromRedis(redisKey);

        if (cachedToken && this.isTokenValid(cachedToken.expiresAt)) {
            this.logger.debug(
                `Using cached token from Redis for ${provider} (expires at ${new Date(cachedToken.expiresAt).toISOString()})`,
            );
            return cachedToken.token;
        }

        const lockKey = `${provider}:${companyId}`;
        const existingRefresh = this.refreshLocks.get(lockKey as any);
        if (existingRefresh) {
            this.logger.debug(`Refresh already in progress for ${provider} (company: ${companyId}), waiting...`);
            try {
                return await existingRefresh;
            } catch (error) {
                this.logger.warn(`Existing refresh promise failed, retrying: ${error.message}`);
                this.refreshLocks.delete(lockKey as any);
            }
        }

        this.logger.log(`Token expired or not found for ${provider} (company: ${companyId}), refreshing...`);
        const refreshPromise = this.refreshToken(provider, companyId, refreshCallback)
            .finally(() => {
                this.refreshLocks.delete(lockKey as any);
                this.logger.debug(`Refresh lock released for ${provider} (company: ${companyId})`);
            });

        this.refreshLocks.set(lockKey as any, refreshPromise);
        return refreshPromise;
    }

    async getActiveToken(provider: ProviderType, companyId: string): Promise<TokenDocument | null> {
        const redisKey = this.getRedisKey(provider, companyId);
        const cachedToken = await this.getTokenFromRedis(redisKey);

        if (cachedToken) {
            if (provider === ProviderType.BASIQ && !cachedToken.userId) {
                const mongoToken = await this.tokenRepository.findActiveByProvider(provider, companyId);
                if (mongoToken && isBasiqToken(mongoToken)) {
                    cachedToken.userId = mongoToken.userId;
                    await this.setTokenInRedis(redisKey, cachedToken, Math.floor((cachedToken.expiresAt - Date.now()) / 1000));
                }
            }

            const tokenDoc = await this.tokenRepository.findActiveByProvider(provider, companyId);
            if (tokenDoc) {
                return tokenDoc;
            }

            return null;
        }

        return this.tokenRepository.findActiveByProvider(provider, companyId);
    }

    private isTokenValid(expiresAt: Date | number): boolean {
        const bufferTime = 5 * 60 * 1000;
        const expiryTime = typeof expiresAt === 'number' ? expiresAt : expiresAt.getTime();
        return new Date(expiryTime - bufferTime) > new Date();
    }

    private getRedisKey(provider: ProviderType, companyId: string): string {
        return `${this.keyPrefix}${provider}:${companyId}`;
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
        companyId: string,
        refreshCallback: () => Promise<AirwallexAuthResponse>,
    ): Promise<string> {
        try {
            await this.deactivateTokens(provider, companyId);

            this.logger.debug(`Calling refresh callback for ${provider} (company: ${companyId})...`);

            let authResponse: AirwallexAuthResponse;
            try {
                authResponse = await refreshCallback();
            } catch (callbackError) {
                this.logger.error(
                    `Refresh callback failed for ${provider} (company: ${companyId}): ${callbackError.message}`,
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

            const redisKey = this.getRedisKey(provider, companyId);

            const existingToken = await this.tokenRepository.findActiveByProvider(provider, companyId);
            const userId = existingToken && isBasiqToken(existingToken) ? existingToken.userId : undefined;

            const tokenData: TokenData = {
                token,
                expiresAt: expiresAtMs,
                userId,
            };

            await this.setTokenInRedis(redisKey, tokenData, expiresIn + 60);

            await this.tokenRepository.create({
                provider,
                companyId,
                token,
                userId,
                expiresAt,
                isActive: true,
                metadata: this.getProviderMetadata(provider, authResponse),
            });

            this.logger.log(
                `Successfully refreshed token for ${provider} (company: ${companyId}, expires at ${expiresAt.toISOString()}) - stored in Redis and MongoDB`,
            );

            return token;
        } catch (error) {
            this.logger.error(
                `Failed to refresh token for ${provider} (company: ${companyId}): ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    async deactivateTokens(provider: ProviderType, companyId: string): Promise<void> {
        const modifiedCount = await this.tokenRepository.deactivateByProvider(provider, companyId);

        if (modifiedCount > 0) {
            this.logger.debug(
                `Deactivated ${modifiedCount} token(s) for ${provider} (company: ${companyId})`,
            );
        }
    }

    async storeToken(
        provider: ProviderType,
        companyId: string,
        token: string,
        expiresIn: number,
        userId?: string,
    ): Promise<TokenDocument> {
        await this.deactivateTokens(provider, companyId);

        const expiresAtMs = Date.now() + expiresIn * 1000;
        const expiresAt = new Date(expiresAtMs);

        const redisKey = this.getRedisKey(provider, companyId);
        const tokenData: TokenData = {
            token,
            expiresAt: expiresAtMs,
            userId,
        };
        await this.setTokenInRedis(redisKey, tokenData, expiresIn + 60);

        return this.tokenRepository.create({
            provider,
            companyId,
            token,
            userId,
            expiresAt,
            isActive: true,
            metadata: this.getProviderMetadataForManualStorage(provider),
        });
    }

    async getTokenInfo(provider: ProviderType, companyId: string): Promise<{
        hasToken: boolean;
        expiresAt?: Date;
        isValid: boolean;
    }> {
        const redisKey = this.getRedisKey(provider, companyId);
        const cachedToken = await this.getTokenFromRedis(redisKey);

        if (cachedToken) {
            return {
                hasToken: true,
                expiresAt: new Date(cachedToken.expiresAt),
                isValid: this.isTokenValid(cachedToken.expiresAt),
            };
        }

        const token = await this.tokenRepository.findActiveByProvider(provider, companyId);

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

    async deleteTokens(provider: ProviderType, companyId: string): Promise<void> {
        const redisKey = this.getRedisKey(provider, companyId);
        await this.redis.del(redisKey);

        const deletedCount = await this.tokenRepository.deleteByProvider(provider, companyId);
        this.logger.log(`Deleted token(s) for ${provider} (company: ${companyId}) from Redis and MongoDB (${deletedCount} MongoDB records)`);
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

