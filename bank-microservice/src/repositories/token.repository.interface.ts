import { TokenDocument } from '../schemas/token.schema';
import { ProviderType } from '../types/provider.enum';

export interface ITokenRepository {
    findActiveByProvider(provider: ProviderType): Promise<TokenDocument | null>;
    create(tokenData: Partial<TokenDocument>): Promise<TokenDocument>;
    deactivateByProvider(provider: ProviderType): Promise<number>;
    deleteByProvider(provider: ProviderType): Promise<number>;
}

export const TokenRepository = Symbol('TokenRepository');
