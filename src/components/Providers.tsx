'use client';

import { useState } from 'react';
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from '@/lib/auth';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [msalInstance] = useState(() => new PublicClientApplication(msalConfig));
  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}
