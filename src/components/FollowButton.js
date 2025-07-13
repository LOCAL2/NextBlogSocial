import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from './Toast';
import { useSocket } from './SocketProvider';

export default function FollowButton({ targetUserId, targetUsername }) {
  const { data: session } = useSession();
  const { socket } = useSocket();
  const toast = useToast();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchFollowStatus = async () => {
    try {
      const response = await fetch(`/api/follow/status/${targetUserId}`);
      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.isFollowing);
      }
    } catch (error) {
      console.error('Error fetching follow status:', error);
    }
  };

  useEffect(() => {
    if (!session || !targetUserId) return;
    fetchFollowStatus();
  }, [session, targetUserId]);

  // Listen for real-time follow updates
  useEffect(() => {
    if (!socket || !session) return;

    const handleUserFollowed = (data) => {
      if (data.followedUserId === targetUserId) {
        console.log('🔔 Real-time follow update: User followed');
        setIsFollowing(true);
      }
    };

    const handleUserUnfollowed = (data) => {
      if (data.unfollowedUserId === targetUserId) {
        console.log('🔔 Real-time unfollow update: User unfollowed');
        setIsFollowing(false);
      }
    };

    socket.on('user-followed', handleUserFollowed);
    socket.on('user-unfollowed', handleUserUnfollowed);

    return () => {
      socket.off('user-followed', handleUserFollowed);
      socket.off('user-unfollowed', handleUserUnfollowed);
    };
  }, [socket, session, targetUserId]);

  const handleFollow = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: targetUserId }),
      });

      if (response.ok) {
        setIsFollowing(true);
        toast.success(`เริ่มติดตาม ${targetUsername} แล้ว`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error following user:', error);
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/follow?userId=${targetUserId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setIsFollowing(false);
        toast.success(`เลิกติดตาม ${targetUsername} แล้ว`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  if (!session || session.user.id === targetUserId) {
    return null;
  }

  return (
    <button
      onClick={isFollowing ? handleUnfollow : handleFollow}
      disabled={loading}
      className={`btn btn-sm gap-2 ${
        isFollowing 
          ? 'btn-outline btn-error' 
          : 'btn-primary'
      }`}
    >
      {loading ? (
        <span className="loading loading-spinner loading-xs"></span>
      ) : isFollowing ? (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          เลิกติดตาม
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          ติดตาม
        </>
      )}
    </button>
  );
}
