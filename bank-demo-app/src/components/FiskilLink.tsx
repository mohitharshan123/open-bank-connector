import { useEffect, useRef, useState } from 'react';
import { link } from '@fiskil/link';
import { toast } from 'react-toastify';

interface FiskilLinkProps {
    sessionId: string | null;
    onSuccess?: (consentId: string) => void;
    onError?: (error: Error) => void;
    onClose?: () => void;
}

export const FiskilLink = ({ sessionId, onSuccess, onError, onClose }: FiskilLinkProps) => {
    console.log('FiskilLink component rendered', { sessionId, hasSessionId: !!sessionId });

    const [isLoading, setIsLoading] = useState(false);
    const flowRef = useRef<any>(null);
    const onSuccessRef = useRef(onSuccess);
    const onErrorRef = useRef(onError);

    // Keep refs updated
    useEffect(() => {
        onSuccessRef.current = onSuccess;
        onErrorRef.current = onError;
    }, [onSuccess, onError]);

    useEffect(() => {
        console.log('FiskilLink useEffect called', { sessionId, hasSessionId: !!sessionId });

        if (!sessionId) {
            console.log('No sessionId, returning early');
            setIsLoading(false);
            return;
        }

        console.log('Starting Fiskil Link initialization with sessionId:', sessionId);
        setIsLoading(true);

        const initializeLink = async () => {
            try {
                console.log('Initializing Fiskil Link with sessionId:', sessionId);
                const flow = link(sessionId);
                flowRef.current = flow;

                console.log('Fiskil Link flow created, waiting for result...');
                const result = await flow;
                console.log('Fiskil Link result:', result);

                if (result?.consentID) {
                    toast.success(`Fiskil consent granted! Consent ID: ${result.consentID}`);
                    onSuccessRef.current?.(result.consentID);
                } else {
                    toast.info('Fiskil link completed');
                    onSuccessRef.current?.('');
                }
            } catch (err: any) {
                console.error('Fiskil Link error:', err);
                toast.error(`Fiskil Link error: ${err?.message || 'Unknown error'}`);
                onErrorRef.current?.(err);
            } finally {
                setIsLoading(false);
            }
        };

        initializeLink();

        return () => {
            console.log('FiskilLink cleanup');
            if (flowRef.current) {
                try {
                    flowRef.current.close?.();
                } catch (err) {
                    console.warn('Error closing Fiskil Link flow:', err);
                }
            }
        };
    }, [sessionId]); // Only depend on sessionId

    const handleClose = () => {
        if (flowRef.current) {
            try {
                flowRef.current.close?.();
            } catch (err) {
                console.warn('Error closing Fiskil Link flow:', err);
            }
        }
        onClose?.();
    };

    // Don't render anything if no sessionId
    if (!sessionId) {
        return null;
    }

    // Show loading overlay while initializing or loading
    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-700">Opening Fiskil Link...</p>
                        <button
                            onClick={handleClose}
                            className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // SDK is handling the UI, so we don't need to render anything else
    return null;
};

