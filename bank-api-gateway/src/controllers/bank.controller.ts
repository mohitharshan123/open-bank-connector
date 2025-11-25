import {
    BadRequestException,
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Logger,
    Post,
} from '@nestjs/common';
import {
    AuthenticateDto,
    CreateBasiqUserDto,
    GetAccountDto,
    GetBalancesDto,
    OAuthRedirectDto,
} from '../dto/bank.dto';
import { BankClientService } from '../services/bank-client.service';

@Controller('api/bank')
export class BankController {
    private readonly logger = new Logger(BankController.name);

    constructor(private readonly bankClient: BankClientService) { }

    @Post('authenticate')
    @HttpCode(HttpStatus.OK)
    async authenticate(@Body() dto: AuthenticateDto) {
        try {
            this.logger.log(`Authenticate request for provider: ${dto.provider}`);
            return await this.bankClient.authenticate({
                provider: dto.provider as any,
                userId: dto.userId,
                oauthCode: dto.oauthCode,
            });
        } catch (error: any) {
            this.logger.error(`Authentication failed: ${error.message}`, error.stack);
            throw new BadRequestException(
                error.message || 'Authentication failed',
            );
        }
    }

    @Post('oauth/redirect')
    @HttpCode(HttpStatus.OK)
    async getOAuthRedirect(@Body() dto: OAuthRedirectDto) {
        try {
            this.logger.log(`OAuth redirect request for provider: ${dto.provider}`);
            return await this.bankClient.getOAuthRedirect({
                provider: dto.provider as any,
                userId: dto.userId,
                action: dto.action,
                state: dto.state,
            });
        } catch (error: any) {
            this.logger.error(`OAuth redirect failed: ${error.message}`, error.stack);
            throw new BadRequestException(
                error.message || 'Failed to get OAuth redirect URL',
            );
        }
    }

    @Post('account')
    @HttpCode(HttpStatus.OK)
    async getAccount(@Body() dto: GetAccountDto) {
        try {
            this.logger.log(`Get account request for provider: ${dto.provider}`);
            return await this.bankClient.getAccount({
                provider: dto.provider as any,
            });
        } catch (error: any) {
            this.logger.error(`Get account failed: ${error.message}`, error.stack);
            throw new BadRequestException(
                error.message || 'Failed to get account',
            );
        }
    }

    @Post('balances')
    @HttpCode(HttpStatus.OK)
    async getBalances(@Body() dto: GetBalancesDto) {
        try {
            this.logger.log(`Get balances request for provider: ${dto.provider}`);
            return await this.bankClient.getBalances({
                provider: dto.provider as any,
            });
        } catch (error: any) {
            this.logger.error(`Get balances failed: ${error.message}`, error.stack);
            throw new BadRequestException(
                error.message || 'Failed to get balances',
            );
        }
    }
}

