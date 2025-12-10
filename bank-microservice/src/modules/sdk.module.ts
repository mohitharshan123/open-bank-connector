import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { AirwallexAccounts } from '../sdk/src/features/accounts/airwallex.accounts';
import { AirwallexAuthentication } from '../sdk/src/features/authentication/airwallex.authentication';
import { AirwallexBalances } from '../sdk/src/features/balances/airwallex.balances';
import { FiskilAccounts } from '../sdk/src/features/accounts/fiskil.accounts';
import { FiskilBalances } from '../sdk/src/features/balances/fiskil.balances';
import { FiskilAuthentication } from '../sdk/src/features/authentication/fiskil.authentication';
import { FiskilUsers } from '../sdk/src/features/users/fiskil.users';
import { FiskilTransactions } from '../sdk/src/features/transactions/fiskil.transactions';
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
        AirwallexAccounts,
        AirwallexAuthentication,
        AirwallexBalances,
        FiskilAccounts,
        FiskilBalances,
        FiskilAuthentication,
        FiskilUsers,
        FiskilTransactions,
    ],
    exports: [
        OpenBankSDK,
        AirwallexAccounts,
        AirwallexAuthentication,
        AirwallexBalances,
        FiskilAccounts,
        FiskilBalances,
        FiskilAuthentication,
        FiskilUsers,
        FiskilTransactions,
    ],
})
export class SdkModule { }

