import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

export enum ProviderType {
    AIRWALLEX = 'airwallex',
    BASIQ = 'basiq',
}

export interface GetAccountRequest {
    provider: ProviderType;
}

export interface GetBalancesRequest {
    provider: ProviderType;
}

export interface AuthenticateRequest {
    provider: ProviderType;
    userId?: string;
    oauthCode?: string;
}

export interface CreateBasiqUserRequest {
    email?: string;
    mobile?: string;
    firstName?: string;
    lastName?: string;
}

export interface OAuthRedirectRequest {
    provider: ProviderType;
    userId?: string;
    action?: string;
    state?: string;
}

@Injectable()
export class BankClientService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(BankClientService.name);
    private client: ClientProxy;

    constructor() {
        this.client = ClientProxyFactory.create({
            transport: Transport.TCP,
            options: {
                host: process.env.MICROSERVICE_HOST || 'localhost',
                port: parseInt(process.env.MICROSERVICE_PORT || '3000', 10),
            },
        });
    }

    async onModuleInit() {
        try {
            await this.client.connect();
            this.logger.log(
                `Connected to bank microservice at ${process.env.MICROSERVICE_HOST || 'localhost'}:${process.env.MICROSERVICE_PORT || '3000'}`,
            );
        } catch (error) {
            this.logger.warn(
                `Failed to connect to microservice at ${process.env.MICROSERVICE_HOST || 'localhost'}:${process.env.MICROSERVICE_PORT || '3000'}. Will retry on first request.`,
            );
            this.logger.warn(`Error: ${error.message}`);
        }
    }

    async onModuleDestroy() {
        await this.client.close();
    }

    private async ensureConnected() {
        try {
            if (!this.client['connected']) {
                await this.client.connect();
                this.logger.log('Connected to microservice');
            }
        } catch (error) {
            this.logger.error(`Failed to connect to microservice: ${error.message}`);
            throw new Error(`Microservice connection failed: ${error.message}`);
        }
    }

    async getAccount(request: GetAccountRequest) {
        await this.ensureConnected();
        this.logger.debug(`Calling microservice: bank.getAccount`, request);
        return firstValueFrom(
            this.client.send('bank.getAccount', {
                provider: request.provider,
            }),
        );
    }

    async getBalances(request: GetBalancesRequest) {
        await this.ensureConnected();
        this.logger.debug(`Calling microservice: bank.getBalances`, request);
        return firstValueFrom(
            this.client.send('bank.getBalances', {
                provider: request.provider,
            }),
        );
    }

    async authenticate(request: AuthenticateRequest) {
        await this.ensureConnected();
        this.logger.debug(`Calling microservice: bank.authenticate`, request);
        return firstValueFrom(
            this.client.send('bank.authenticate', {
                provider: request.provider,
                userId: request.userId,
                oauthCode: request.oauthCode,
            }),
        );
    }

    async createBasiqUser(request: CreateBasiqUserRequest) {
        await this.ensureConnected();
        this.logger.debug(`Calling microservice: bank.createBasiqUser`, request);
        return firstValueFrom(
            this.client.send('bank.createBasiqUser', request),
        );
    }

    async getOAuthRedirect(request: OAuthRedirectRequest) {
        await this.ensureConnected();
        this.logger.debug(`Calling microservice: bank.oauthRedirect`, request);
        return firstValueFrom(
            this.client.send('bank.oauthRedirect', {
                provider: request.provider,
                userId: request.userId,
                action: request.action,
                state: request.state,
            }),
        );
    }
}

