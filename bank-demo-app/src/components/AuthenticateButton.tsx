import type { ProviderType } from '../api/bankApi';
import { useAuthenticate, useOAuthRedirect } from '../hooks/useBankQueries';

interface AuthenticateButtonProps {
    provider: ProviderType;
}

export const AuthenticateButton = ({ provider }: AuthenticateButtonProps) => {
    const authenticate = useAuthenticate();
    const getOAuthRedirect = useOAuthRedirect();

    const handleAuthenticate = async () => {
        try {
            // For Basiq, use authenticate endpoint which creates user and returns redirectUrl
            // For Airwallex, use getOAuthRedirect to get the OAuth URL
            if (provider === 'basiq') {
              const result = await authenticate.mutateAsync({
                    provider,
                });
                console.log('result', result);
                window.location.href = result.redirectUrl;
                // The redirect will be handled by useAuthenticate's onSuccess callback
            } else {
                const result = await getOAuthRedirect.mutateAsync({
                    provider,
                    action: 'connect',
                });
                window.location.href = result.redirectUrl;
            }
        } catch (error) {
            console.error('Authentication failed:', error);
        }
    };

    const isLoading = provider === 'basiq' ? authenticate.isPending : getOAuthRedirect.isPending;
    const errorMessage = (provider === 'basiq' ? authenticate.error : getOAuthRedirect.error)
        ? ((provider === 'basiq' ? authenticate.error : getOAuthRedirect.error) as any)?.response?.data?.message
        || ((provider === 'basiq' ? authenticate.error : getOAuthRedirect.error) as any)?.message
        || 'Failed to initiate authentication flow'
        : null;

    return (
        <div className="flex flex-col gap-2">
            <button
                onClick={handleAuthenticate}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                {isLoading
                    ? 'Processing...'
                    : (provider === 'basiq' ? authenticate.isSuccess : getOAuthRedirect.isSuccess)
                        ? 'Redirecting...'
                        : `Connect ${provider}`}
            </button>
            {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-800">
                    {errorMessage}
                </div>
            )}
        </div>
    );
};

