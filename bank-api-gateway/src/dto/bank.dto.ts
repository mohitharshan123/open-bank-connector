import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ProviderTypeDto {
    AIRWALLEX = 'airwallex',
    BASIQ = 'basiq',
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
}

export class CreateBasiqUserDto {
    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    mobile?: string;

    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;
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

