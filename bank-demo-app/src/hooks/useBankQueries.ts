import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import type { OAuthRedirectRequest, ProviderType } from '../api/bankApi';
import { bankApi } from '../api/bankApi';
import { QUERY_KEYS } from '../constants/queryKeys';

export const useAuthenticate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ provider, companyId, userId, oauthCode }: { provider: ProviderType; companyId: string; userId?: string; oauthCode?: string }) =>
            bankApi.authenticate({ provider, companyId, userId, oauthCode }),
        mutationKey: [QUERY_KEYS.authenticate],
        onSuccess: (data, variables) => {
            if (data.redirectUrl) {
                window.location.href = data.redirectUrl;
                return; 
            }
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.accounts, variables.provider, variables.companyId] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.balances, variables.provider, variables.companyId] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.connectionStatus, variables.provider, variables.companyId] });
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

export const useAccount = (provider: ProviderType, companyId: string, enabled = true) => {
    return useQuery({
        queryKey: [QUERY_KEYS.accounts, provider, companyId],
        queryFn: () => bankApi.getAccount({ provider, companyId }),
        enabled: enabled && !!provider && !!companyId,
    });
};

export const useBalances = (provider: ProviderType, companyId: string, enabled = true) => {
    return useQuery({
        queryKey: [QUERY_KEYS.balances, provider, companyId],
        queryFn: () => bankApi.getBalances({ provider, companyId }),
        enabled: enabled && !!provider && !!companyId,
    });
};

export const useConnectionStatus = (provider: ProviderType, companyId: string, enabled = true) => {
    return useQuery({
        queryKey: [QUERY_KEYS.connectionStatus, provider, companyId],
        queryFn: () => bankApi.getConnectionStatus({ provider, companyId }),
        enabled: enabled && !!provider && !!companyId,
        refetchInterval: 30000,
    });
};
