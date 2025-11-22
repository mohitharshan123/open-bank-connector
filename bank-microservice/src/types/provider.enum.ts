/**
 * Supported banking provider types
 */
export enum ProviderType {
    AIRWALLEX = 'airwallex',
}

/**
 * Type guard to check if a string is a valid provider type
 */
export function isProviderType(value: string): value is ProviderType {
    return Object.values(ProviderType).includes(value as ProviderType);
}

