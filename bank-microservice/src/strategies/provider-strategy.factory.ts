import { Injectable, Logger } from '@nestjs/common';
import { AuthenticationNotSupportedException } from '../exceptions/provider.exception';
import { ProviderType } from '../types/provider.enum';
import { AirwallexStrategy } from './airwallex.strategy';
import { BasiqStrategy } from './basiq.strategy';
import { IProviderStrategy } from './provider-strategy.interface';

/**
 * Factory for creating provider-specific strategies
 */
@Injectable()
export class ProviderStrategyFactory {
    private readonly logger = new Logger(ProviderStrategyFactory.name);
    private readonly strategies = new Map<ProviderType, IProviderStrategy>();

    constructor(
        private readonly basiqStrategy: BasiqStrategy,
        private readonly airwallexStrategy: AirwallexStrategy,
    ) {
        this.strategies.set(ProviderType.BASIQ, this.basiqStrategy);
        this.strategies.set(ProviderType.AIRWALLEX, this.airwallexStrategy);
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

