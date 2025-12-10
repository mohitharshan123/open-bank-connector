import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import type { AuthenticateRequest, OAuthRedirectRequest, ProviderType } from '../api/bankApi';
import { bankApi } from '../api/bankApi';
import { QUERY_KEYS } from '../constants/queryKeys';

export const useAuthenticate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (request: AuthenticateRequest) => bankApi.authenticate(request),
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

export const useTransactions = (
    provider: ProviderType,
    companyId: string,
    userId?: string,
    accountId?: string,
    from?: string,
    to?: string,
    status?: 'PENDING' | 'POSTED',
    enabled = true,
) => {
    return useQuery({
        queryKey: [QUERY_KEYS.transactions, provider, companyId, userId, accountId, from, to, status],
        queryFn: () => bankApi.getTransactions({ provider, companyId, userId, accountId, from, to, status }),
        enabled: enabled && !!provider && !!companyId,
    });
};
