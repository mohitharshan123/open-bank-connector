import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import type { ProviderType } from '../api/bankApi';
import { bankApi } from '../api/bankApi';
import { QUERY_KEYS } from '../constants/queryKeys';

export const useAuthenticate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (provider: ProviderType) => bankApi.authenticate({ provider }),
        mutationKey: [QUERY_KEYS.authenticate],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.accounts] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.balances] });
        },
        onError: () => {
            toast.error('Authentication failed');
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

