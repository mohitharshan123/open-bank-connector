import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import type { ProviderType, OAuthRedirectRequest } from '../api/bankApi';
import { bankApi } from '../api/bankApi';
import { QUERY_KEYS } from '../constants/queryKeys';

export const useAuthenticate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ provider, userId, oauthCode }: { provider: ProviderType; userId?: string; oauthCode?: string }) =>
            bankApi.authenticate({ provider, userId, oauthCode }),
        mutationKey: [QUERY_KEYS.authenticate],
        onSuccess: (data) => {
            // If redirectUrl is present, redirect user to consent page (e.g., Basiq)
            if (data.redirectUrl) {
                window.location.href = data.redirectUrl;
                return; // Don't invalidate queries yet, wait for user to complete OAuth flow
            }
            // Otherwise, authentication completed successfully (e.g., Airwallex OAuth callback)
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.accounts] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.balances] });
        },
        onError: () => {
            toast.error('Authentication failed');
        },
    });
};

export const useOAuthRedirect = () => {
    return useMutation({
        mutationFn: (request: OAuthRedirectRequest) => bankApi.getOAuthRedirect(request),
        onError: () => {
            toast.error('Failed to get OAuth redirect URL');
        },
    });
};

export const useAccount = (provider: ProviderType, enabled = true) => {
    return useQuery({
        queryKey: [QUERY_KEYS.accounts, provider],
        queryFn: () => bankApi.getAccount({ provider }),
        enabled: enabled && !!provider,
    });
};

export const useBalances = (provider: ProviderType, enabled = true) => {
    return useQuery({
        queryKey: [QUERY_KEYS.balances, provider],
        queryFn: () => bankApi.getBalances({ provider }),
        enabled: enabled && !!provider,
    });
};

