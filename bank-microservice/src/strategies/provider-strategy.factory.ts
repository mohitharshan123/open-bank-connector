import { Injectable, Logger } from '@nestjs/common';
import { AuthenticationNotSupportedException } from '../exceptions/provider.exception';
import { ProviderType } from '../types/provider.enum';
import { AirwallexStrategy } from './airwallex.strategy';
import { FiskilStrategy } from './fiskil.strategy';
import { IProviderStrategy } from './provider-strategy.interface';

/**
 * Factory for creating provider-specific strategies
 */
@Injectable()
export class ProviderStrategyFactory {
    private readonly logger = new Logger(ProviderStrategyFactory.name);
    private readonly strategies = new Map<ProviderType, IProviderStrategy>();

    constructor(
        private readonly airwallexStrategy: AirwallexStrategy,
        private readonly fiskilStrategy: FiskilStrategy,
    ) {
        this.strategies.set(ProviderType.AIRWALLEX, this.airwallexStrategy);
        this.strategies.set(ProviderType.FISKIL, this.fiskilStrategy);
    }

    getStrategy(provider: ProviderType): IProviderStrategy {
        const strategy = this.strategies.get(provider);
        if (!strategy) {
            throw new AuthenticationNotSupportedException(provider);
        }
        return strategy;
    }

    getSupportedProviders(): ProviderType[] {
        return Array.from(this.strategies.keys());
    }
}

