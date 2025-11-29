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

export class TokenNotFoundException extends HttpException {
    constructor(provider: string, companyId: string) {
        super(
            `${provider.charAt(0).toUpperCase() + provider.slice(1)} token not found for company '${companyId}'. Please authenticate first.`,
            HttpStatus.UNAUTHORIZED,
        );
    }
}

export class InvalidTokenException extends HttpException {
    constructor(provider: string, companyId: string, reason?: string) {
        super(
            `Invalid ${provider} token for company '${companyId}'. ${reason || 'Please authenticate again.'}`,
            HttpStatus.UNAUTHORIZED,
        );
    }
}
