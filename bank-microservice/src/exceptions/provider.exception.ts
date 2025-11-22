import { HttpException, HttpStatus } from '@nestjs/common';

export class ProviderNotInitializedException extends HttpException {
    constructor(provider: string) {
        super(
            `Provider '${provider}' is not initialized. Please check your configuration.`,
            HttpStatus.SERVICE_UNAVAILABLE,
        );
    }
}

export class ProviderNotSupportedException extends HttpException {
    constructor(provider: string) {
        super(
            `Provider '${provider}' is not supported. Supported providers: airwallex`,
            HttpStatus.BAD_REQUEST,
        );
    }
}

export class AuthenticationNotSupportedException extends HttpException {
    constructor(provider: string) {
        super(
            `Authentication is only supported for Airwallex. Provider '${provider}' does not support authentication.`,
            HttpStatus.BAD_REQUEST,
        );
    }
}

export class ProviderOperationException extends HttpException {
    constructor(provider: string, operation: string, originalError?: any) {
        super(
            `Failed to ${operation} for provider '${provider}': ${originalError?.message || 'Unknown error'}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
}

