'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from './Toast';
import { useSocket } from './SocketProvider';

export default function FriendButton({ targetUserId, targetUsername, initialStatus = null }) {
  const { data: session } = useSession();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState(null);
  const toast = useToast();
  const { socket } = useSocket();

  const fetchStatus = async () => {
    try {
      console.log(`FriendButton - Fetching status for ${targetUserId}...`);
      const response = await fetch(`/api/friends/status/${targetUserId}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`FriendButton - Fetched status for ${targetUserId}:`, data);
        setStatus(data.status);
        setRequestId(data.requestId);
      } else {
        console.error(`FriendButton - Failed to fetch status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching friend status:', error);
    }
  };

  useEffect(() => {
    if (!session || !targetUserId) return;

    // Always fetch fresh status, ignore initialStatus for now
    fetchStatus();

    // Set up interval to refresh status every 5 seconds
    const interval = setInterval(() => {
      fetchStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [session, targetUserId]);

  // Listen for real-time friend updates
  useEffect(() => {
    if (!socket || !session) return;

    const handleFriendUpdate = (data) => {
      console.log('FriendButton - Received friend status update:', data);
      if (data.userId === targetUserId) {
        console.log('FriendButton - Updating status to:', data.status);
        setStatus(data.status);
        if (data.requestId) {
          setRequestId(data.requestId);
        } else if (data.status === 'none') {
          setRequestId(null);
        }
        // Force refresh status from server to ensure accuracy
        setTimeout(() => fetchStatus(), 500);
      }
    };

    socket.on('friend-status-update', handleFriendUpdate);

    return () => {
      socket.off('friend-status-update', handleFriendUpdate);
    };
  }, [socket, session, targetUserId]);

  const handleSendRequest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiverId: targetUserId }),
      });

      if (response.ok) {
        const data = await response.json();
        setStatus('pending_sent');
        setRequestId(data._id);
        toast.success(`ส่งคำขอเป็นเพื่อนไปยัง ${targetUsername} แล้ว`);
        // Refresh status to make sure it's accurate
        setTimeout(() => fetchStatus(), 1000);
      } else {
        const error = await response.json();
        toast.error(error.error || 'เกิดข้อผิดพลาดในการส่งคำขอ');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('เกิดข้อผิดพลาดในการส่งคำขอ');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/friends/${requestId}`, {
        method: 'PUT',
      });

      if (response.ok) {
        setStatus('friends');
        toast.success(`ตอนนี้คุณเป็นเพื่อนกับ ${targetUsername} แล้ว`);
        // Refresh status to make sure it's accurate
        setTimeout(() => fetchStatus(), 1000);
      } else {
        const error = await response.json();
        toast.error(error.error || 'เกิดข้อผิดพลาดในการรับคำขอ');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast.error('เกิดข้อผิดพลาดในการรับคำขอ');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/friends/${requestId || targetUserId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setStatus('none');
        setRequestId(null);
        toast.success('ยกเลิกคำขอเป็นเพื่อนแล้ว');
        // Refresh status to make sure it's accurate
        setTimeout(() => fetchStatus(), 1000);
      } else {
        const error = await response.json();
        toast.error(error.error || 'เกิดข้อผิดพลาดในการยกเลิก');
      }
    } catch (error) {
      console.error('Error canceling friend request:', error);
      toast.error('เกิดข้อผิดพลาดในการยกเลิก');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    // Create confirmation modal
    const modal = document.createElement('div');
    modal.className = 'modal modal-open';
    modal.innerHTML = `
      <div class="modal-box">
        <h3 class="font-bold text-lg">ยืนยันการยกเลิกเป็นเพื่อน</h3>
        <p class="py-4">คุณแน่ใจหรือไม่ที่จะยกเลิกเป็นเพื่อนกับ ${targetUsername}?</p>
        <div class="modal-action">
          <button class="btn btn-ghost" id="cancel-remove">ยกเลิก</button>
          <button class="btn btn-error" id="confirm-remove">ยกเลิกเป็นเพื่อน</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const confirmRemove = () => {
      return new Promise((resolve) => {
        modal.querySelector('#confirm-remove').onclick = () => {
          document.body.removeChild(modal);
          resolve(true);
        };
        modal.querySelector('#cancel-remove').onclick = () => {
          document.body.removeChild(modal);
          resolve(false);
        };
      });
    };
    
    const confirmed = await confirmRemove();
    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/friends?friendId=${targetUserId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setStatus('none');
        setRequestId(null);
        toast.success(`ยกเลิกเป็นเพื่อนกับ ${targetUsername} แล้ว`);
        // Refresh status to make sure it's accurate
        setTimeout(() => fetchStatus(), 1000);
      } else {
        const error = await response.json();
        toast.error(error.error || 'เกิดข้อผิดพลาดในการยกเลิกเป็นเพื่อน');
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      toast.error('เกิดข้อผิดพลาดในการยกเลิกเป็นเพื่อน');
    } finally {
      setLoading(false);
    }
  };

  if (!session || session.user.id === targetUserId) {
    return null;
  }

  // Debug info
  console.log('FriendButton render - Status:', status, 'Target:', targetUserId);

  const getButtonConfig = () => {
    switch (status) {
      case 'friends':
        return {
          text: 'เป็นเพื่อนกันแล้ว',
          className: 'btn-success',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          onClick: handleRemoveFriend
        };
      case 'pending_sent':
        return {
          text: 'ส่งคำขอแล้ว',
          className: 'btn-warning',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          onClick: handleCancelRequest
        };
      case 'pending_received':
        return {
          text: 'รับคำขอ',
          className: 'btn-info',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          onClick: handleAcceptRequest
        };
      default:
        return {
          text: 'เพิ่มเป็นเพื่อน',
          className: 'btn-primary',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          ),
          onClick: handleSendRequest
        };
    }
  };

  const config = getButtonConfig();

  return (
    <div className="flex gap-2 items-center">
      <button
        onClick={config.onClick}
        disabled={loading}
        className={`btn btn-sm ${config.className} gap-2`}
      >
        {loading ? (
          <span className="loading loading-spinner loading-xs"></span>
        ) : (
          config.icon
        )}
        {config.text}
      </button>

      {/* Debug refresh button */}
      <button
        onClick={fetchStatus}
        className="btn btn-ghost btn-xs"
        title="Refresh Status"
      >
        🔄
      </button>
    </div>
  );
}
