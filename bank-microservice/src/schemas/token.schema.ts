import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ProviderType } from '../types/provider.enum';

export interface AirwallexTokenMetadata {
    clientId: string;
    apiKey: string;
    scope?: string;
}

/**
 * Base token schema with common fields shared by all providers
 * Note: The 'provider' field is used as the discriminator key, so it's automatically managed by Mongoose
 */
@Schema({
    timestamps: true,
    discriminatorKey: 'provider',
    collection: 'tokens',
})
export class BaseToken {
    @Prop({ required: true })
    token: string;

    @Prop({ required: true })
    expiresAt: Date;

    @Prop({ default: false })
    isActive: boolean;

    @Prop({ required: true, index: true })
    companyId: string;

    /**
     * Provider-specific metadata stored as a flexible object
     */
    @Prop({ type: Object })
    metadata?: Record<string, any>;

    @Prop()
    createdAt?: Date;

    @Prop()
    updatedAt?: Date;
}

export const BaseTokenSchema = SchemaFactory.createForClass(BaseToken);

BaseTokenSchema.index({ provider: 1, companyId: 1, isActive: 1 });
BaseTokenSchema.index({ companyId: 1, provider: 1 });
BaseTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Airwallex token schema - requires refreshToken
 * The 'provider' field is automatically set to ProviderType.AIRWALLEX by Mongoose discriminator
 */
@Schema()
export class AirwallexToken extends BaseToken {
    @Prop({ required: true })
    refreshToken: string;
}

export const AirwallexTokenSchema = SchemaFactory.createForClass(AirwallexToken);

BaseTokenSchema.discriminator(ProviderType.AIRWALLEX, AirwallexTokenSchema);

export type BaseTokenDocument = BaseToken & Document & { provider: ProviderType };
export type AirwallexTokenDocument = AirwallexToken & Document & { provider: ProviderType.AIRWALLEX };
export type FiskilTokenDocument = BaseToken & Document & { provider: ProviderType.FISKIL };
export type TokenDocument = AirwallexTokenDocument | FiskilTokenDocument;

export function isAirwallexToken(token: BaseTokenDocument): token is AirwallexTokenDocument {
    return token.provider === ProviderType.AIRWALLEX;
}

export function isFiskilToken(token: BaseTokenDocument): token is FiskilTokenDocument {
    return token.provider === ProviderType.FISKIL;
}

export const Token = BaseToken;
export const TokenSchema = BaseTokenSchema;
