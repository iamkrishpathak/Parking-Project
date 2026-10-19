import { useEffect, useRef, useState } from 'react';

const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';
let googleScriptPromise;

const loadGoogleIdentityServices = () => {
  if (window.google?.accounts?.id) return Promise.resolve();

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GOOGLE_IDENTITY_SCRIPT;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => {
        googleScriptPromise = null;
        reject(new Error('Google sign-in could not load. Check your connection and try again.'));
      };
      document.head.appendChild(script);
    });
  }

  return googleScriptPromise;
};

const GoogleSignInButton = ({ onCredential, onError, disabled = false }) => {
  const buttonRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);
  const [loadError, setLoadError] = useState('');
  const clientId = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();

  onCredentialRef.current = onCredential;
  onErrorRef.current = onError;

  useEffect(() => {
    const buttonElement = buttonRef.current;
    if (!clientId || !buttonElement) return undefined;

    let cancelled = false;
    loadGoogleIdentityServices()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              onCredentialRef.current?.(response.credential);
            } else {
              onErrorRef.current?.('Google did not return a sign-in credential.');
            }
          },
          auto_select: false,
        });

        window.google.accounts.id.renderButton(buttonElement, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: Math.min(buttonElement.clientWidth || 360, 400),
        });
      })
      .catch((error) => {
        if (!cancelled) {
          const message = error.message || 'Google sign-in could not load.';
          setLoadError(message);
          onErrorRef.current?.(message);
        }
      });

    return () => {
      cancelled = true;
      buttonElement.innerHTML = '';
    };
  }, [clientId]);

  if (!clientId) {
    return (
      <p className="text-sm text-center text-slate-500">
        Google sign-in needs a client ID. Set <code>REACT_APP_GOOGLE_CLIENT_ID</code> in <code>client/.env</code>.
      </p>
    );
  }

  return (
    <div>
      {loadError && <p role="alert" className="mb-3 text-sm text-rose-600">{loadError}</p>}
      <div
        ref={buttonRef}
        className={`flex min-h-10 justify-center ${disabled ? 'pointer-events-none opacity-60' : ''}`}
        aria-disabled={disabled}
      />
    </div>
  );
};

export default GoogleSignInButton;
