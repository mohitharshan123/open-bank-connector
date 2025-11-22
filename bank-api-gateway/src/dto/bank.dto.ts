import { IsEnum } from 'class-validator';

export enum ProviderTypeDto {
    AIRWALLEX = 'airwallex',
}

export class GetAccountDto {
    @IsEnum(ProviderTypeDto)
    provider: ProviderTypeDto;
}

export class GetBalancesDto {
    @IsEnum(ProviderTypeDto)
    provider: ProviderTypeDto;
}

export class AuthenticateDto {
    @IsEnum(ProviderTypeDto)
    provider: ProviderTypeDto;
}

