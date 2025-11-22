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

    async findActiveByProvider(provider: ProviderType): Promise<TokenDocument | null> {
        return this.tokenModel
            .findOne({
                provider,
                isActive: true,
            })
            .sort({ createdAt: -1 })
            .exec();
    }

    async create(tokenData: Partial<TokenDocument>): Promise<TokenDocument> {
        const tokenDoc = new this.tokenModel(tokenData);
        return tokenDoc.save();
    }

    async deactivateByProvider(provider: ProviderType): Promise<number> {
        const result = await this.tokenModel.updateMany(
            { provider, isActive: true },
            { isActive: false },
        );
        return result.modifiedCount;
    }

    async deleteByProvider(provider: ProviderType): Promise<number> {
        const result = await this.tokenModel.deleteMany({ provider }).exec();
        return result.deletedCount;
    }
}

