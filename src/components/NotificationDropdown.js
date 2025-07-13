'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useSocket } from './SocketProvider';
import { useToast } from './Toast';

export default function NotificationDropdown() {
  const { data: session } = useSession();
  const { socket } = useSocket();
  const toast = useToast();
  const dropdownRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!session) return;

    fetchNotifications();
  }, [session]);

  // Real-time notifications
  useEffect(() => {
    if (!socket || !session) return;

    const handleNotification = (data) => {
      if (data.userId === session.user.id) {
        setNotifications(prev => [data, ...prev.slice(0, 19)]); // Keep only 20 latest
        setUnreadCount(prev => prev + 1);
        
        // Show toast notification
        toast.info(data.message);
      }
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket, session, toast]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationIds,
          markAllAsRead: markAll,
        }),
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

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead([notification._id]);
    }
    setShowDropdown(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like_post':
      case 'like_comment':
        return (
          <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        );
      case 'comment':
      case 'reply':
        return (
          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a9.863 9.863 0 01-4.906-1.289L3 21l1.289-5.094A9.863 9.863 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
            </svg>
          </div>
        );
      case 'friend_request':
      case 'friend_accept':
        return (
          <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
        );
      case 'new_post':
        return (
          <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6z" />
            </svg>
          </div>
        );
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'เมื่อสักครู่';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ชั่วโมงที่แล้ว`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} วันที่แล้ว`;
    
    return date.toLocaleDateString('th-TH');
  };

  if (!session) return null;

  return (
    <div className="dropdown dropdown-end" ref={dropdownRef}>
      <div
        tabIndex={0}
        role="button"
        className="btn btn-ghost btn-circle"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Notification button clicked, showDropdown:', !showDropdown);
          setShowDropdown(!showDropdown);
        }}
      >
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
      
      {showDropdown && (
        <div
          className="dropdown-content z-[9999] menu p-0 shadow-lg bg-base-100 rounded-box w-80 max-h-96 overflow-y-auto border border-base-300"
          style={{
            position: 'absolute',
            top: '100%',
            right: '0',
            marginTop: '0.5rem'
          }}
        >
          <div className="sticky top-0 bg-base-100 p-4 border-b border-base-300">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">การแจ้งเตือน</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAsRead(null, true)}
                  className="btn btn-ghost btn-xs"
                >
                  อ่านทั้งหมด
                </button>
              )}
            </div>
          </div>
          
          <div className="p-2">
            <div className="text-center py-4">
              <p className="text-sm">🔔 Notification Dropdown Working!</p>
              <p className="text-xs">showDropdown: {showDropdown.toString()}</p>
              <p className="text-xs">unreadCount: {unreadCount}</p>
              <p className="text-xs">notifications: {notifications.length}</p>
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-md"></span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-base-content/60">ไม่มีการแจ้งเตือน</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-3 rounded-lg cursor-pointer hover:bg-base-200 transition-colors ${
                    !notification.isRead ? 'bg-primary/10' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    {getNotificationIcon(notification.type)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {notification.sender?.avatar ? (
                          <img
                            src={notification.sender.avatar}
                            alt={notification.sender.displayName}
                            className="w-4 h-4 rounded-full"
                          />
                        ) : (
                          <div className="w-4 h-4 bg-neutral text-neutral-content rounded-full flex items-center justify-center">
                            <span className="text-xs">{notification.sender?.displayName?.charAt(0)}</span>
                          </div>
                        )}
                        <span className="font-medium text-sm">
                          {notification.sender?.displayName}
                        </span>
                      </div>
                      
                      <p className="text-sm text-base-content/80 mt-1">
                        {notification.message}
                      </p>
                      
                      {notification.relatedPost?.content && (
                        <p className="text-xs text-base-content/60 mt-1 truncate">
                          "{notification.relatedPost.content}"
                        </p>
                      )}
                      
                      <p className="text-xs text-base-content/50 mt-1">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                    
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
