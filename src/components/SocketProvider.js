'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default function SocketProvider({ children }) {
  const { data: session } = useSession();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (session?.user) {
      // Initialize socket connection
      const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin, {
        transports: ['polling', 'websocket'], // Try polling first
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true
      });

      socketInstance.on('connect', () => {
        console.log('🔌 Connected to socket server');
        setIsConnected(true);

        // Join user-specific room
        console.log('🏠 Joining user room:', session.user.id);
        socketInstance.emit('join-user-room', session.user.id);

        // Join global feed room
        console.log('🌍 Joining global feed room');
        socketInstance.emit('join-feed');
      });

      socketInstance.on('disconnect', () => {
        console.log('Disconnected from socket server');
        setIsConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.warn('Socket connection error (will retry):', error.message);
        setIsConnected(false);
      });

      socketInstance.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
      });

      socketInstance.on('reconnect_error', (error) => {
        console.warn('Socket reconnection failed:', error.message);
      });

      socketInstance.on('reconnect_failed', () => {
        console.error('Socket reconnection failed after all attempts');
        setIsConnected(false);
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    }
  }, [session]);

  const value = {
    socket,
    isConnected
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
      {/* Connection Status Indicator */}
      {session?.user && (
        <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
          isConnected ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}>
          <div className="alert alert-warning shadow-lg">
            <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>กำลังเชื่อมต่อ...</span>
          </div>
        </div>
      )}
    </SocketContext.Provider>
  );
}
