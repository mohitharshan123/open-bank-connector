import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BankController } from './bank.controller';
import { BankService } from './bank.service';
import bankConfig from './config/bank.config';
import redisConfig from './config/redis.config';
import { TokenAuthGuard } from './guards/token-auth.guard';
import { RedisModule } from './modules/redis.module';
import { SdkModule } from './modules/sdk.module';
import { MongoTokenRepository } from './repositories/mongo-token.repository';
import { TokenRepository } from './repositories/token.repository.interface';
import { Token, TokenSchema } from './schemas/token.schema';
import { TokenService } from './services/token.service';
import { AirwallexStrategy } from './strategies/airwallex.strategy';
import { FiskilStrategy } from './strategies/fiskil.strategy';
import { AirwallexAuthentication } from './strategies/features/authentication/airwallex.authentication';
import { AirwallexOAuth } from './strategies/features/oauth/airwallex.oauth';
import { FiskilAuthentication } from './strategies/features/authentication/fiskil.authentication';
import { FiskilOAuth } from './strategies/features/oauth/fiskil.oauth';
import { FiskilUsers } from './strategies/features/users/fiskil.users';
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
    TokenAuthGuard,
    {
      provide: TokenRepository,
      useClass: MongoTokenRepository,
    },
    AirwallexAuthentication,
    AirwallexOAuth,
    AirwallexStrategy,
    FiskilAuthentication,
    FiskilOAuth,
    FiskilUsers,
    FiskilStrategy,
    ProviderStrategyFactory,
  ],
})
export class AppModule { }
