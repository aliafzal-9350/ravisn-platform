import React, { useState } from 'react';
import { router } from '@inertiajs/react';

declare global {
  interface Window {
    FB: any;
  }
}

export default function ConnectModal() {
  const [loading, setLoading] = useState(false);

  const handleLaunchEmbeddedSignup = () => {
    setLoading(true);

    if (typeof window.FB === 'undefined') {
      alert('Facebook SDK failed to load. Please refresh the page and try again.');
      setLoading(false);
      return;
    }

    // Launch Meta Embedded Signup Popup
    window.FB.login(
      (response: any) => {
        if (response.authResponse && response.authResponse.code) {
          const code = response.authResponse.code;

          // Send temporary authorization code to Laravel backend
          router.post(
            '/whatsapp/embedded-signup/callback',
            { code },
            {
              onSuccess: () => {
                setLoading(false);
                alert('WhatsApp Business Account connected successfully!');
              },
              onError: (errors) => {
                setLoading(false);
                console.error(errors);
                alert('Failed to complete setup on server.');
              },
            }
          );
        } else {
          setLoading(false);
          console.log('User canceled login or did not authorize.');
        }
      },
      {
        config_id: import.meta.env.VITE_WHATSAPP_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
        },
      }
    );
  };

  return (
    <button
      onClick={handleLaunchEmbeddedSignup}
      disabled={loading}
      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow transition"
    >
      {loading ? 'Connecting...' : 'Connect WhatsApp via Meta'}
    </button>
  );
}
