import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Token, TokenDocument } from '../schemas/token.schema';
import { ProviderType } from '../types/provider.enum';
import { ITokenRepository } from './token.repository.interface';

@Injectable()
export class MongoTokenRepository implements ITokenRepository {
    constructor(
        @InjectModel(Token.name) private readonly tokenModel: Model<TokenDocument>,
    ) { }

    async findActiveByProvider(provider: ProviderType, companyId: string): Promise<TokenDocument | null> {
        return this.tokenModel
            .findOne({
                provider,
                companyId,
                isActive: true,
            })
            .sort({ createdAt: -1 })
            .exec();
    }

    async create(tokenData: Partial<TokenDocument>): Promise<TokenDocument> {
        const tokenDoc = new this.tokenModel(tokenData);
        return tokenDoc.save();
    }

    async deactivateByProvider(provider: ProviderType, companyId: string): Promise<number> {
        const result = await this.tokenModel.updateMany(
            { provider, companyId, isActive: true },
            { isActive: false },
        );
        return result.modifiedCount;
    }

    async deleteByProvider(provider: ProviderType, companyId: string): Promise<number> {
        const result = await this.tokenModel.deleteMany({ provider, companyId }).exec();
        return result.deletedCount;
    }

    async updateMetadata(provider: ProviderType, companyId: string, metadata: Record<string, any>): Promise<TokenDocument | null> {
        const tokenDoc = await this.findActiveByProvider(provider, companyId);
        if (!tokenDoc) {
            return null;
        }

        const existingMetadata = tokenDoc.metadata || {};
        const updatedMetadata = {
            ...existingMetadata,
            ...metadata,
        };

        const result = await this.tokenModel.updateOne(
            { _id: tokenDoc._id },
            { $set: { metadata: updatedMetadata } }
        ).exec();

        if (result.modifiedCount === 0) {
            tokenDoc.metadata = updatedMetadata;
            return tokenDoc.save();
        }

        return this.findActiveByProvider(provider, companyId);
    }
}

