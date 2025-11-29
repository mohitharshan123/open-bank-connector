import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { AirwallexAccounts } from '../sdk/src/features/accounts/airwallex.accounts';
import { BasiqAccounts } from '../sdk/src/features/accounts/basiq.accounts';
import { AirwallexAuthentication } from '../sdk/src/features/authentication/airwallex.authentication';
import { BasiqAuthentication } from '../sdk/src/features/authentication/basiq.authentication';
import { AirwallexBalances } from '../sdk/src/features/balances/airwallex.balances';
import { BasiqBalances } from '../sdk/src/features/balances/basiq.balances';
import { BasiqJobs } from '../sdk/src/features/jobs/basiq.jobs';
import { BasiqUsers } from '../sdk/src/features/users/basiq.users';
import { OpenBankSDK } from '../sdk/src/sdk';

/**
 * NestJS module for the Open Bank SDK
 * This module provides a unified interface to interact with multiple banking providers
 * 
 * Marked as @Global() so it can be imported once and used throughout the application
 */
@Global()
@Module({
    imports: [HttpModule],
    providers: [
        OpenBankSDK,
        // SDK Feature services (injectable)
        AirwallexAccounts,
        AirwallexAuthentication,
        AirwallexBalances,
        BasiqAccounts,
        BasiqAuthentication,
        BasiqBalances,
        BasiqJobs,
        BasiqUsers,
    ],
    exports: [
        OpenBankSDK,
        AirwallexAccounts,
        AirwallexAuthentication,
        AirwallexBalances,
        BasiqAccounts,
        BasiqAuthentication,
        BasiqBalances,
        BasiqJobs,
        BasiqUsers,
    ],
})
export class SdkModule { }

