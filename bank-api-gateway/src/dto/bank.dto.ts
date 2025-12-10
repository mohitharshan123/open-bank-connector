import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum ProviderTypeDto {
    AIRWALLEX = 'airwallex',
    FISKIL = 'fiskil',
}

export class UserDetailsDto {
    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    phone?: string;
}

export class GetAccountDto {
    @IsEnum(ProviderTypeDto)
    provider: ProviderTypeDto;

    @IsString()
    companyId: string;
}

export class GetBalancesDto {
    @IsEnum(ProviderTypeDto)
    provider: ProviderTypeDto;

    @IsString()
    companyId: string;
}

export class GetTransactionsDto {
    @IsEnum(ProviderTypeDto)
    provider: ProviderTypeDto;

    @IsString()
    companyId: string;

    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsString()
    accountId?: string;

    @IsOptional()
    @IsString()
    from?: string;

    @IsOptional()
    @IsString()
    to?: string;

    @IsOptional()
    @IsString()
    status?: 'PENDING' | 'POSTED';
}

export class AuthenticateDto {
    @IsEnum(ProviderTypeDto)
    provider: ProviderTypeDto;

    @IsString()
    companyId: string;

    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsString()
    oauthCode?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => UserDetailsDto)
    userDetails?: UserDetailsDto;
}

export class OAuthRedirectDto {
    @IsEnum(ProviderTypeDto)
    provider: ProviderTypeDto;

    @IsString()
    companyId: string;

    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsString()
    action?: string;

    @IsOptional()
    @IsString()
    state?: string;
}

