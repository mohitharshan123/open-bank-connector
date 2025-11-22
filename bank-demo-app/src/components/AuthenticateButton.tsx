import type { ProviderType } from '../api/bankApi';
import { useAuthenticate } from '../hooks/useBankQueries';

interface AuthenticateButtonProps {
    provider: ProviderType;
}

export const AuthenticateButton = ({ provider }: AuthenticateButtonProps) => {
    const authenticate = useAuthenticate();

    const handleAuthenticate = () => {
        authenticate.mutate(provider);
    };

    const errorMessage = authenticate.error
        ? (authenticate.error as any)?.response?.data?.message || authenticate.error?.message || 'Authentication failed'
        : null;

    return (
        <div className="flex flex-col gap-2">
            <button
                onClick={handleAuthenticate}
                disabled={authenticate.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                {authenticate.isPending
                    ? 'Authenticating...'
                    : authenticate.isSuccess
                        ? '✓ Authenticated!'
                        : `Authenticate ${provider}`}
            </button>
            {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-800">
                    {errorMessage}
                </div>
            )}
        </div>
    );
};

