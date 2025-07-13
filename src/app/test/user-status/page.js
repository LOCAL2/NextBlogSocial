'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from '../../../components/SocketProvider';

export default function UserStatusTest() {
  const { data: session } = useSession();
  const { socket, isConnected } = useSocket();
  const [userStatus, setUserStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchUserStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test/user-status');
      if (response.ok) {
        const data = await response.json();
        setUserStatus(data.user);
      } else {
        console.error('Failed to fetch user status');
      }
    } catch (error) {
      console.error('Error fetching user status:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (isOnline) => {
    setLoading(true);
    try {
      const response = await fetch('/api/test/user-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isOnline }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserStatus(data.user);
      } else {
        console.error('Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchUserStatus();
    }
  }, [session]);

  useEffect(() => {
    if (!socket) return;

    const handleUserStatusChanged = (data) => {
      console.log('Received user status change:', data);
      if (data.userId === session?.user?.id) {
        setUserStatus(prev => ({
          ...prev,
          isOnline: data.isOnline,
          lastSeen: new Date()
        }));
      }
    };

    socket.on('user-status-changed', handleUserStatusChanged);

    return () => {
      socket.off('user-status-changed', handleUserStatusChanged);
    };
  }, [socket, session]);

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in to test user status</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">User Status Test</h1>
        
        {/* Socket Connection Status */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title">Socket Connection</h2>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-success' : 'bg-error'}`}></div>
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            {session?.user?.id && (
              <p className="text-sm text-base-content/60">User ID: {session.user.id}</p>
            )}
          </div>
        </div>

        {/* User Status */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title">Current User Status</h2>
            {loading ? (
              <div className="flex justify-center">
                <span className="loading loading-spinner loading-md"></span>
              </div>
            ) : userStatus ? (
              <div className="space-y-2">
                <p><strong>Username:</strong> {userStatus.username}</p>
                <p><strong>Display Name:</strong> {userStatus.displayName}</p>
                <div className="flex items-center gap-2">
                  <strong>Status:</strong>
                  <div className={`w-3 h-3 rounded-full ${userStatus.isOnline ? 'bg-success' : 'bg-base-300'}`}></div>
                  <span>{userStatus.isOnline ? 'Online' : 'Offline'}</span>
                </div>
                <p><strong>Last Seen:</strong> {new Date(userStatus.lastSeen).toLocaleString()}</p>
              </div>
            ) : (
              <p>No user status data</p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Controls</h2>
            <div className="flex gap-4">
              <button
                onClick={fetchUserStatus}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? 'Loading...' : 'Refresh Status'}
              </button>
              <button
                onClick={() => updateUserStatus(true)}
                disabled={loading}
                className="btn btn-success"
              >
                Set Online
              </button>
              <button
                onClick={() => updateUserStatus(false)}
                disabled={loading}
                className="btn btn-error"
              >
                Set Offline
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
