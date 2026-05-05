'use client';

import { useMsal } from '@azure/msal-react';
import { loginRequest } from '@/lib/auth';

export default function Login() {
  const { instance } = useMsal();

  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--amika-white)' }}
    >
      <div className="text-center">
        <h1
          className="text-4xl font-bold mb-4"
          style={{ color: 'var(--amika-orange)' }}
        >
          AskAmika
        </h1>
        <p className="text-lg mb-8" style={{ color: 'var(--amika-gray-text)' }}>
          Sign in with your company account
        </p>
        <button onClick={handleLogin} className="btn-primary">
          Sign In
        </button>
      </div>
    </div>
  );
}
