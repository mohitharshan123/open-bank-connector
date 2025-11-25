import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
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
        OpenBankSDK
    ],
    exports: [
        OpenBankSDK,
    ],
})
export class SdkModule { }

