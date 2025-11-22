/**
 * Logger interface for SDK logging
 * Allows the SDK to use different logging implementations (NestJS Logger, console, etc.)
 */
export interface ILogger {
    debug(message: string, context?: any): void;
    log(message: string, context?: any): void;
    warn(message: string, context?: any): void;
    error(message: string, context?: any): void;
}

export class ConsoleLogger implements ILogger {
    debug(message: string, context?: any): void {
        console.debug(`[SDK] ${message}`, context || '');
    }

    log(message: string, context?: any): void {
        console.log(`[SDK] ${message}`, context || '');
    }

    warn(message: string, context?: any): void {
        console.warn(`[SDK] ${message}`, context || '');
    }

    error(message: string, context?: any): void {
        console.error(`[SDK] ${message}`, context || '');
    }
}

