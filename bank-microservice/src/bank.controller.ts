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
        this.logger.debug('Received authenticate command', { provider: data.provider });
        const provider = this.validateProvider(data.provider);
        return this.bankService.authenticate(provider);
    }
}

