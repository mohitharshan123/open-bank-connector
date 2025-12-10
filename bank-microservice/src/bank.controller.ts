import { Controller, Logger, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BankService } from './bank.service';
import { ProviderType, isProviderType } from './types/provider.enum';
import { TokenAuthGuard } from './guards/token-auth.guard';

export interface GetAccountCommand {
    provider: ProviderType | string;
    companyId: string;
    userId?: string;
}

export interface GetBalancesCommand {
    provider: ProviderType | string;
    companyId: string;
    userId?: string;
}

export interface GetTransactionsCommand {
    provider: ProviderType | string;
    companyId: string;
    userId?: string;
    accountId?: string;
    from?: string;
    to?: string;
    status?: 'PENDING' | 'POSTED';
}

export interface AuthenticateCommand {
    provider: ProviderType | string;
    companyId: string;
    userId?: string;
    oauthCode?: string;
    email?: string;
    name?: string;
    phone?: string;
}

export interface OAuthRedirectCommand {
    provider: ProviderType | string;
    companyId: string;
    userId?: string;
    action?: string;
    state?: string;
}

export interface GetJobsCommand {
    provider: ProviderType | string;
    companyId: string;
    jobId?: string;
}

export interface ConnectionStatusCommand {
    provider: ProviderType | string;
    companyId: string;
}

export interface CreateFiskilUserCommand {
    companyId: string;
    email?: string;
    name?: string;
    phone?: string;
}

@Controller()
export class BankController {
    private readonly logger = new Logger(BankController.name);

    constructor(private readonly bankService: BankService) { }

    private validateProvider(provider: string): ProviderType {
        if (!isProviderType(provider)) {
            throw new Error(
                `Invalid provider: ${provider}. Supported providers: ${Object.values(ProviderType).join(', ')}`,
            );
        }
        return provider as ProviderType;
    }

    @MessagePattern('bank.getAccount')
    @UseGuards(TokenAuthGuard)
    async getAccount(@Payload() data: GetAccountCommand) {
        this.logger.debug('Received getAccount command', {
            provider: data.provider,
            companyId: data.companyId,
            userId: data.userId,
        });
        const provider = this.validateProvider(data.provider);
        this.logger.debug('Getting account for provider', { provider, companyId: data.companyId, userId: data.userId });
        return this.bankService.getAccount(provider, data.companyId, data.userId);
    }

    @MessagePattern('bank.getBalances')
    @UseGuards(TokenAuthGuard)
    async getBalances(@Payload() data: GetBalancesCommand) {
        this.logger.debug('Received getBalances command', {
            provider: data.provider,
            companyId: data.companyId,
            userId: data.userId,
        });
        const provider = this.validateProvider(data.provider);
        return this.bankService.getBalances(provider, data.companyId, data.userId);
    }

    @MessagePattern('bank.getTransactions')
    @UseGuards(TokenAuthGuard)
    async getTransactions(@Payload() data: GetTransactionsCommand) {
        this.logger.debug('Received getTransactions command', {
            provider: data.provider,
            companyId: data.companyId,
            userId: data.userId,
            accountId: data.accountId,
        });
        const provider = this.validateProvider(data.provider);
        return this.bankService.getTransactions(
            provider,
            data.companyId,
            data.userId,
            data.accountId,
            data.from,
            data.to,
            data.status,
        );
    }

    @MessagePattern('bank.authenticate')
    async authenticate(@Payload() data: AuthenticateCommand) {
        this.logger.debug('Received authenticate command', {
            provider: data.provider,
            companyId: data.companyId,
            userId: data.userId,
            hasOAuthCode: !!data.oauthCode,
            hasUserData: !!(data.email || data.name || data.phone),
        });
        const provider = this.validateProvider(data.provider);
        return this.bankService.authenticate(
            provider,
            data.companyId,
            data.userId,
            data.oauthCode,
            data.email || data.name || data.phone ? {
                email: data.email,
                name: data.name,
                phone: data.phone,
            } : undefined,
        );
    }

    @MessagePattern('bank.oauthRedirect')
    async getOAuthRedirect(@Payload() data: OAuthRedirectCommand) {
        this.logger.debug('Received oauthRedirect command', data);
        const provider = this.validateProvider(data.provider);
        return this.bankService.getOAuthRedirectUrl(provider, data.companyId, data.userId, data.action, data.state);
    }

    @MessagePattern('bank.deleteTokens')
    async deleteTokens(@Payload() data: { provider: ProviderType | string; companyId: string }) {
        this.logger.debug('Received deleteTokens command', { provider: data.provider, companyId: data.companyId });
        const provider = this.validateProvider(data.provider);
        await this.bankService.deleteTokens(provider, data.companyId);
        return { success: true, message: `Tokens deleted for ${provider}, company: ${data.companyId}` };
    }

    @MessagePattern('bank.connectionStatus')
    async getConnectionStatus(@Payload() data: ConnectionStatusCommand) {
        this.logger.debug('Received connectionStatus command', data);
        const provider = this.validateProvider(data.provider);
        const isConnected = await this.bankService.isConnected(provider, data.companyId);
        return { isConnected, provider, companyId: data.companyId };
    }

    @MessagePattern('bank.createFiskilUser')
    async createFiskilUser(@Payload() data: CreateFiskilUserCommand) {
        this.logger.debug('Received createFiskilUser command', data);
        return this.bankService.createFiskilUser(data.companyId, {
            email: data.email,
            name: data.name,
            phone: data.phone,
        });
    }
}

