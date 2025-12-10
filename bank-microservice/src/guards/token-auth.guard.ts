import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { TokenNotFoundException } from '../exceptions/provider.exception';
import { TokenService } from '../services/token.service';
import { ProviderType } from '../types/provider.enum';

/**
 * Interface for commands that require authentication
 */
export interface AuthenticatedCommand {
    provider: ProviderType | string;
    companyId: string;
    _tokenDoc?: any;
}

/**
 * Auth guard that validates tokens before allowing access to protected endpoints
 * Works with NestJS microservices message patterns
 */
@Injectable()
export class TokenAuthGuard implements CanActivate {
    private readonly logger = new Logger(TokenAuthGuard.name);

    constructor(private readonly tokenService: TokenService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const data = context.switchToRpc().getData() as AuthenticatedCommand;

        if (!data || !data.provider || !data.companyId) {
            this.logger.warn('Missing provider or companyId in request');
            throw new RpcException({
                status: 400,
                message: 'Provider and companyId are required',
            });
        }

        const provider = data.provider as ProviderType;
        this.logger.debug(`[TokenAuthGuard] Validating token for provider: ${provider}, company: ${data.companyId}`);

        try {
            const tokenDoc = await this.tokenService.getActiveToken(provider, data.companyId);

            if (!tokenDoc) {
                this.logger.warn(`[TokenAuthGuard] Token not found for provider: ${provider}, company: ${data.companyId}`);
                throw new RpcException(
                    new TokenNotFoundException(provider, data.companyId),
                );
            }

            context.switchToRpc().getData()._tokenDoc = tokenDoc;

            this.logger.debug(`[TokenAuthGuard] Token validated successfully for provider: ${provider}, company: ${data.companyId}`);
            return true;
        } catch (error) {
            if (error instanceof RpcException) {
                throw error;
            }

            this.logger.error(`[TokenAuthGuard] Token validation failed: ${error.message}`, error.stack);
            throw new RpcException(
                new TokenNotFoundException(provider, data.companyId),
            );
        }
    }
}

