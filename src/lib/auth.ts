import type { Configuration, RedirectRequest } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || '',
    authority: process.env.NEXT_PUBLIC_AZURE_AD_AUTHORITY || '',
    redirectUri: process.env.NEXT_PUBLIC_AZURE_AD_REDIRECT_URI || '',
  },
  cache: {
    cacheLocation: 'localStorage',
  },
};

export const loginRequest: RedirectRequest = {
  scopes: ['openid', 'profile', 'email'],
};

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
}

interface EntraTokenClaims {
  oid?: string;
  preferred_username?: string;
  name?: string;
  exp?: number;
}

export function extractUserFromToken(token: EntraTokenClaims): AuthenticatedUser {
  if (!token.oid || !token.preferred_username) {
    throw new Error('Token missing required claims (oid, preferred_username)');
  }
  return {
    id: token.oid,
    email: token.preferred_username,
    name: token.name,
  };
}

// Stub: production must verify the JWT signature against Entra ID's JWKS.
// This decodes the payload and checks the expiry only.
export function validateToken(token: string): AuthenticatedUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString()) as EntraTokenClaims;
    if (!decoded.oid || !decoded.exp) return null;
    if (decoded.exp < Date.now() / 1000) return null;
    return extractUserFromToken(decoded);
  } catch {
    return null;
  }
}
