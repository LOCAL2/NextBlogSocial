'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from '../components/SocketProvider';

export function useUserUpdates() {
  const { data: session, update } = useSession();
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !session) return;

    const handleUserUpdated = (data) => {
      console.log('useUserUpdates: Received user-updated event:', data);
      console.log('Current session user ID:', session.user.id);

      if (data.userId === session.user.id) {
        console.log('Updating session for current user');
        // Update session with new data (gentle update without triggering re-renders)
        update({
          ...session,
          user: {
            ...session.user,
            publicTitles: data.publicTitles,
            customBadges: data.customBadges || session.user.customBadges,
            role: data.role || session.user.role
          }
        }).catch(error => {
          console.error('Error updating session:', error);
        });
      } else {
        console.log('User update is for different user, ignoring');
      }
    };

    socket.on('user-updated', handleUserUpdated);

    return () => {
      socket.off('user-updated', handleUserUpdated);
    };
  }, [socket, session, update]);
}
