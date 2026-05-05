'use client';

import { useIsAuthenticated } from '@azure/msal-react';
import ChatInterface from '@/components/ChatInterface';
import Login from '@/components/Login';

export default function Home() {
  const isAuthenticated = useIsAuthenticated();

  if (!isAuthenticated) {
    return <Login />;
  }

  return <ChatInterface />;
}
