'use client';

import { SessionProvider } from 'next-auth/react';
import SocketProvider from './SocketProvider';
import UserUpdatesProvider from './UserUpdatesProvider';

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <SocketProvider>
        <UserUpdatesProvider>
          {children}
        </UserUpdatesProvider>
      </SocketProvider>
    </SessionProvider>
  );
}
