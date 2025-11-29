import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import type { ProviderType } from '../api/bankApi';
import { useAuthenticate, useConnectionStatus, useOAuthRedirect } from '../hooks/useBankQueries';

interface ConnectButtonProps {
    provider: ProviderType;
    companyId: string;
}

export const ConnectButton = ({ provider, companyId }: ConnectButtonProps) => {
    const navigate = useNavigate();
    const authenticate = useAuthenticate();
    const getOAuthRedirect = useOAuthRedirect();
    const { data: connectionStatus } = useConnectionStatus(provider, companyId);

    const handleConnect = async () => {
        try {
            if (provider === 'basiq') {
                const result = await authenticate.mutateAsync({
                    provider,
                    companyId,
                });
                if (result.redirectUrl) {
                    window.location.href = result.redirectUrl;
                }
            } else {
                const result = await getOAuthRedirect.mutateAsync({
                    provider,
                    companyId,
                    action: 'connect',
                });
                window.location.href = result.redirectUrl;
            }
        } catch (error) {
            console.error('Connection failed:', error);
            toast.error('Failed to connect');
        }
    };

    const handleViewDetails = () => {
        navigate(`/provider/${provider}/${companyId}`);
    };

    if (connectionStatus?.isConnected) {
        return (
            <div className="flex gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                    ✓ Connected
                </span>
                <button
                    onClick={handleViewDetails}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    View Details
                </button>
            </div>
        );
    }

    const isLoading = provider === 'basiq' ? authenticate.isPending : getOAuthRedirect.isPending;

    return (
        <button
            onClick={handleConnect}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
            {isLoading ? 'Connecting...' : `Connect ${provider === 'airwallex' ? 'Airwallex' : 'Basiq'}`}
        </button>
    );
};

