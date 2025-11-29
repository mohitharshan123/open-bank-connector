import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for token auth guard
 */
export const REQUIRE_TOKEN_AUTH = 'requireTokenAuth';

/**
 * Decorator to mark endpoints that require token authentication
 * Usage: @RequireTokenAuth() on message pattern handlers
 */
export const RequireTokenAuth = () => SetMetadata(REQUIRE_TOKEN_AUTH, true);

