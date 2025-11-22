import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ProviderType } from '../types/provider.enum';

export type TokenDocument = Token & Document;

export interface AirwallexTokenMetadata {
    clientId: string;
    apiKey: string; // Stored for reference (not used as token)
    scope?: string;
}

/**
 * Unified extensible token schema that supports provider-specific fields
 * Uses a flexible metadata field to store provider-specific information
 * while maintaining a single collection for all providers
 */
@Schema({
    timestamps: true,
    collection: 'tokens',
})
export class Token {
    @Prop({ required: true, enum: ProviderType, index: true })
    provider: ProviderType;

    @Prop({ required: true })
    token: string;

    @Prop()
    refreshToken?: string;

    @Prop({ required: true })
    expiresAt: Date;

    @Prop({ default: false })
    isActive: boolean;

    /**
     * Provider-specific metadata stored as a flexible object
     * Allows each provider to store additional information
     */
    @Prop({ type: Object })
    metadata?: Record<string, any>;

    @Prop()
    createdAt?: Date;

    @Prop()
    updatedAt?: Date;
}

export const TokenSchema = SchemaFactory.createForClass(Token);

TokenSchema.index({ provider: 1, isActive: 1 });

TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

