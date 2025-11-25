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
    // Note: 'provider' field is automatically managed by Mongoose discriminator
    // Do NOT define it with @Prop() - Mongoose will add it automatically

    @Prop({ required: true })
    token: string;

    @Prop({ required: true })
    expiresAt: Date;

    @Prop({ default: false })
    isActive: boolean;

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

BaseTokenSchema.index({ provider: 1, isActive: 1 });
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

/**
 * Basiq token schema - requires userId
 * The 'provider' field is automatically set to ProviderType.BASIQ by Mongoose discriminator
 */
@Schema()
export class BasiqToken extends BaseToken {
    @Prop({ required: true })
    userId: string;
}

export const BasiqTokenSchema = SchemaFactory.createForClass(BasiqToken);

BaseTokenSchema.discriminator(ProviderType.AIRWALLEX, AirwallexTokenSchema);
BaseTokenSchema.discriminator(ProviderType.BASIQ, BasiqTokenSchema);

export type BaseTokenDocument = BaseToken & Document & { provider: ProviderType };
export type AirwallexTokenDocument = AirwallexToken & Document & { provider: ProviderType.AIRWALLEX };
export type BasiqTokenDocument = BasiqToken & Document & { provider: ProviderType.BASIQ };
export type TokenDocument = AirwallexTokenDocument | BasiqTokenDocument;

export function isAirwallexToken(token: BaseTokenDocument): token is AirwallexTokenDocument {
    return token.provider === ProviderType.AIRWALLEX;
}

export function isBasiqToken(token: BaseTokenDocument): token is BasiqTokenDocument {
    return token.provider === ProviderType.BASIQ;
}

export const Token = BaseToken;
export const TokenSchema = BaseTokenSchema;
