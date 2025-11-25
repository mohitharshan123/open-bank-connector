import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BankService } from './bank.service';
import { ProviderType, isProviderType } from './types/provider.enum';

export interface GetAccountCommand {
    provider: ProviderType | string;
}

export interface GetBalancesCommand {
    provider: ProviderType | string;
}

export interface AuthenticateCommand {
    provider: ProviderType | string;
    userId?: string;
    oauthCode?: string;
}

export interface CreateBasiqUserCommand {
    email?: string;
    mobile?: string;
    firstName?: string;
    lastName?: string;
}

export interface OAuthRedirectCommand {
    provider: ProviderType | string;
    userId?: string;
    action?: string;
    state?: string;
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
    async getAccount(@Payload() data: GetAccountCommand) {
        this.logger.debug('Received getAccount command', {
            provider: data.provider,
        });
        const provider = this.validateProvider(data.provider);
        return this.bankService.getAccount(provider);
    }

    @MessagePattern('bank.getBalances')
    async getBalances(@Payload() data: GetBalancesCommand) {
        this.logger.debug('Received getBalances command', {
            provider: data.provider,
        });
        const provider = this.validateProvider(data.provider);
        return this.bankService.getBalances(provider);
    }

    @MessagePattern('bank.authenticate')
    async authenticate(@Payload() data: AuthenticateCommand) {
        this.logger.debug('Received authenticate command', { provider: data.provider, userId: data.userId, hasOAuthCode: !!data.oauthCode });
        const provider = this.validateProvider(data.provider);
        return this.bankService.authenticate(provider, data.userId, data.oauthCode);
    }

    @MessagePattern('bank.oauthRedirect')
    async getOAuthRedirect(@Payload() data: OAuthRedirectCommand) {
        this.logger.debug('Received oauthRedirect command', data);
        const provider = this.validateProvider(data.provider);
        return this.bankService.getOAuthRedirectUrl(provider, data.userId, data.action, data.state);
    }

    @MessagePattern('bank.deleteTokens')
    async deleteTokens(@Payload() data: { provider: ProviderType | string }) {
        this.logger.debug('Received deleteTokens command', { provider: data.provider });
        const provider = this.validateProvider(data.provider);
        await this.bankService.deleteTokens(provider);
        return { success: true, message: `Tokens deleted for ${provider}` };
    }
}

