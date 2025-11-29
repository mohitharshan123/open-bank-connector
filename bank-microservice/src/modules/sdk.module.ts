import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OpenBankSDK } from '../sdk/src/sdk';
import { AirwallexAccounts } from '../sdk/src/features/accounts/airwallex.accounts';
import { AirwallexAuthentication } from '../sdk/src/features/authentication/airwallex.authentication';
import { AirwallexBalances } from '../sdk/src/features/balances/airwallex.balances';
import { BasiqAccounts } from '../sdk/src/features/accounts/basiq.accounts';
import { BasiqAuthentication } from '../sdk/src/features/authentication/basiq.authentication';
import { BasiqBalances } from '../sdk/src/features/balances/basiq.balances';
import { BasiqJobs } from '../sdk/src/features/jobs/basiq.jobs';

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
    ],
})
export class SdkModule { }

