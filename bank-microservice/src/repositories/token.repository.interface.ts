import { TokenDocument } from '../schemas/token.schema';
import { ProviderType } from '../types/provider.enum';

export interface ITokenRepository {
    findActiveByProvider(provider: ProviderType, companyId: string): Promise<TokenDocument | null>;
    create(tokenData: Partial<TokenDocument>): Promise<TokenDocument>;
    deactivateByProvider(provider: ProviderType, companyId: string): Promise<number>;
    deleteByProvider(provider: ProviderType, companyId: string): Promise<number>;
    updateMetadata(provider: ProviderType, companyId: string, metadata: Record<string, any>): Promise<TokenDocument | null>;
}

export const TokenRepository = Symbol('TokenRepository');
