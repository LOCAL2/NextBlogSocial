'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSocket } from './SocketProvider';
import { useToast } from './Toast';
import { formatDate } from '../utils/dateUtils';

export default function SimpleNotificationDropdown() {
  const { data: session } = useSession();
  const { socket } = useSocket();
  const toast = useToast();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) return;
    fetchNotifications();
  }, [session]);

  // Real-time notifications
  useEffect(() => {
    if (!socket || !session) return;

    const handleNotification = (data) => {
      if (data.userId === session.user.id) {
        setNotifications(prev => [data, ...prev.slice(0, 19)]);
        setUnreadCount(prev => prev + 1);
        toast.info(data.message);
      }
    };

    const handleNewNotification = (data) => {
      setNotifications(prev => [data.notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show different toast messages based on notification type
      let toastMessage = data.notification.message;
      if (data.notification.type === 'friend_request') {
        toastMessage = `🤝 ${data.notification.sender.displayName} ส่งคำขอเป็นเพื่อน`;
      } else if (data.notification.type === 'friend_accepted') {
        toastMessage = `✅ ${data.notification.sender.displayName} ยอมรับคำขอเป็นเพื่อน`;
      } else if (data.notification.type === 'friend_declined') {
        toastMessage = `❌ ${data.notification.sender.displayName} ปฏิเสธคำขอเป็นเพื่อน`;
      } else if (data.notification.type === 'friend_removed') {
        toastMessage = `💔 ${data.notification.sender.displayName} ลบคุณออกจากรายการเพื่อน`;
      }

      toast.success(toastMessage);
    };

    socket.on('notification', handleNotification);
    socket.on('new-notification', handleNewNotification);
    return () => {
      socket.off('notification', handleNotification);
      socket.off('new-notification', handleNewNotification);
    };
  }, [socket, session, toast]);

  const fetchNotifications = async () => {
    if (!session) return;

    setLoading(true);
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationIds = null, markAll = false) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds, markAllAsRead: markAll }),
      });

      if (response.ok) {
        if (markAll) {
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
          setUnreadCount(0);
        } else if (notificationIds) {
          setNotifications(prev => prev.map(n => 
            notificationIds.includes(n._id) ? { ...n, isRead: true } : n
          ));
          setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
        }
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotifications([]);
        setUnreadCount(0);
        toast.success('ลบการแจ้งเตือนทั้งหมดแล้ว');
      } else {
        toast.error('เกิดข้อผิดพลาดในการลบการแจ้งเตือน');
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast.error('เกิดข้อผิดพลาดในการลบการแจ้งเตือน');
    }
  };

  const handleNotificationClick = (notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      markAsRead([notification._id]);
    }

    // Navigate based on notification type
    if (notification.type === 'friend_request') {
      router.push('/friends?tab=requests');
    } else if (notification.type === 'friend_accepted' || notification.type === 'friend_declined' || notification.type === 'friend_removed') {
      router.push('/friends');
    } else if (notification.relatedPost) {
      router.push(`/posts/${notification.relatedPost._id}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'เมื่อสักครู่';

    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'เมื่อสักครู่';
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'เมื่อสักครู่';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ชั่วโมงที่แล้ว`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} วันที่แล้ว`;

    try {
      return date.toLocaleDateString('th-TH');
    } catch (error) {
      return 'เมื่อสักครู่';
    }
  };

  if (!session) return null;

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
        <div className="indicator">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6z" />
          </svg>
          {unreadCount > 0 && (
            <span className="badge badge-xs badge-primary indicator-item">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
      
      <div tabIndex={0} className="dropdown-content z-[1] shadow bg-base-100 rounded-box w-96 max-h-[32rem] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-3 border-b sticky top-0 bg-base-100">
          <span className="font-semibold">การแจ้งเตือน</span>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <button
                onClick={() => markAsRead(null, true)}
                className="btn btn-ghost btn-xs"
              >
                อ่านทั้งหมด
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="btn btn-error btn-xs"
              >
                ลบทั้งหมด
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-2">
          {loading ? (
            <div className="flex justify-center py-4">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-base-content/60">ไม่มีการแจ้งเตือน</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.slice(0, 10).map((notification, index) => (
                <div
                  key={notification._id || `notification-${index}`}
                  className={`flex flex-col gap-1 p-2 rounded-lg cursor-pointer hover:bg-base-200 ${!notification.isRead ? 'bg-primary/10' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-center gap-2">
                    <div>
                      {notification.sender?.avatar ? (
                        <img
                          src={notification.sender.avatar}
                          alt={notification.sender.displayName}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-neutral text-neutral-content rounded-full flex items-center justify-center">
                          <span className="text-xs">{notification.sender?.displayName?.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {notification.sender?.displayName}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    )}
                  </div>

                  <p className="text-xs text-base-content/80 ml-8">
                    {notification.message}
                  </p>

                  {notification.relatedPost?.content && (
                    <p className="text-xs text-base-content/60 ml-8 truncate">
                      "                      &quot;{notification.relatedPost.content.substring(0, 50)}...&quot;"
                    </p>
                  )}

                  <p className="text-xs text-base-content/50 ml-8">
                    {formatDate(notification.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {notifications.length > 10 && (
            <div>
              <div className="divider my-2"></div>
              <div className="text-center">
                <Link href="/notifications" className="text-primary hover:text-primary-focus">
                  ดูการแจ้งเตือนทั้งหมด
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
