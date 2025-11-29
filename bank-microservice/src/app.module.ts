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
import { TokenAuthGuard } from './guards/token-auth.guard';
import { BasiqAuthentication } from './strategies/features/authentication/basiq.authentication';
import { BasiqAccounts } from './strategies/features/accounts/basiq.accounts';
import { BasiqBalances } from './strategies/features/balances/basiq.balances';
import { BasiqJobs } from './strategies/features/jobs/basiq.jobs';
import { AirwallexAuthentication } from './strategies/features/authentication/airwallex.authentication';
import { AirwallexAccounts } from './strategies/features/accounts/airwallex.accounts';
import { AirwallexBalances } from './strategies/features/balances/airwallex.balances';

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
    BasiqAuthentication,
    BasiqAccounts,
    BasiqBalances,
    BasiqJobs,
    AirwallexAuthentication,
    AirwallexAccounts,
    AirwallexBalances,
    BasiqStrategy,
    AirwallexStrategy,
    ProviderStrategyFactory,
  ],
})
export class AppModule { }
