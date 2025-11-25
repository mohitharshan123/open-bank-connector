import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BankController } from './bank.controller';
import { BankService } from './bank.service';
import bankConfig from './config/bank.config';
import redisConfig from './config/redis.config';
import { RedisModule } from './modules/redis.module';
import { SdkModule } from './modules/sdk.module';
import { MongoTokenRepository } from './repositories/mongo-token.repository';
import { TokenRepository } from './repositories/token.repository.interface';
import { Token, TokenSchema } from './schemas/token.schema';
import { TokenService } from './services/token.service';
import { AirwallexStrategy } from './strategies/airwallex.strategy';
import { BasiqStrategy } from './strategies/basiq.strategy';
import { ProviderStrategyFactory } from './strategies/provider-strategy.factory';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [bankConfig, redisConfig],
    }),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    RedisModule,
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('bank.mongodb.uri'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }]),
    SdkModule, 
  ],
  controllers: [BankController],
  providers: [
    BankService,
    TokenService,
    {
      provide: TokenRepository,
      useClass: MongoTokenRepository,
    },
    BasiqStrategy,
    AirwallexStrategy,
    ProviderStrategyFactory,
  ],
})
export class AppModule { }
