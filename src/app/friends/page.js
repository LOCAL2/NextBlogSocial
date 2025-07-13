'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '../../components/Toast';

function FriendsContent() {
  const { data: session, status } = useSession();
  const toast = useToast();
  const searchParams = useSearchParams();
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'friends');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchFriends();
      fetchFriendRequests();
    }
  }, [session]);

  const fetchFriends = async () => {
    try {
      const response = await fetch('/api/friends');
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const response = await fetch('/api/friends/requests?type=received');
      if (response.ok) {
        const data = await response.json();
        setFriendRequests(data.filter(req => req.status === 'pending'));
      }
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFriendRequest = async (requestId, action) => {
    try {
      const response = await fetch(`/api/friends/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        fetchFriends();
        fetchFriendRequests();
        toast.success(action === 'accept' ? 'ยอมรับคำขอเป็นเพื่อนแล้ว' : 'ปฏิเสธคำขอเป็นเพื่อนแล้ว');
      } else {
        const error = await response.json();
        toast.error(error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error handling friend request:', error);
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const handleRemoveFriend = async (friendId, friendName) => {
    // Show confirmation dialog
    const confirmed = window.confirm(`คุณต้องการลบ ${friendName} ออกจากรายการเพื่อนหรือไม่?`);
    if (!confirmed) return;

    console.log('Removing friend:', { friendId, friendName });

    try {
      console.log('Calling DELETE route...');
      const response = await fetch(`/api/friends?friendId=${friendId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Remove friend response:', response.status);

      if (response.ok) {
        try {
          const data = await response.json();
          console.log('Remove friend success:', data);
          fetchFriends();
          toast.success(`ลบ ${friendName} ออกจากรายการเพื่อนแล้ว`);
        } catch (jsonError) {
          console.error('JSON parse error (success):', jsonError);
          fetchFriends();
          toast.success(`ลบ ${friendName} ออกจากรายการเพื่อนแล้ว`);
        }
      } else {
        try {
          const error = await response.json();
          console.error('Remove friend error:', error);
          toast.error(error.error || 'เกิดข้อผิดพลาดในการลบเพื่อน');
        } catch (jsonError) {
          console.error('JSON parse error (failure):', jsonError);
          const text = await response.text();
          console.error('Response text:', text);
          toast.error(`เกิดข้อผิดพลาดในการลบเพื่อน (${response.status})`);
        }
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      toast.error('เกิดข้อผิดพลาดในการลบเพื่อน');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p>กรุณาเข้าสู่ระบบเพื่อดูเพื่อน</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">เพื่อน</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('friends')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'friends'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-white hover:border-gray-300'
            }`}
          >
            เพื่อน ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'requests'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-white hover:border-gray-300'
            }`}
          >
            คำขอเป็นเพื่อน ({friendRequests.length})
          </button>
        </nav>
      </div>

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <div>
          {friends.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white">คุณยังไม่มีเพื่อน</p>
              <Link
                href="/search"
                className="mt-4 inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
              >
                ค้นหาเพื่อน
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {friends.map((friend) => (
                <div key={friend._id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {friend.avatar && (
                        <img
                          src={friend.avatar}
                          alt={friend.displayName}
                          className="w-12 h-12 rounded-full"
                        />
                      )}
                      <div>
                        <Link
                          href={`/profile/${friend.username}`}
                          className="font-semibold text-gray-900 hover:text-indigo-600"
                        >
                          {friend.displayName}
                        </Link>
                        <p className="text-sm text-gray-500">@{friend.username}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveFriend(friend._id, friend.displayName)}
                      className="btn btn-error btn-sm"
                      title="ลบเพื่อน"
                    >
                      ลบเพื่อน
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Friend Requests Tab */}
      {activeTab === 'requests' && (
        <div>
          {friendRequests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white">ไม่มีคำขอเป็นเพื่อน</p>
            </div>
          ) : (
            <div className="space-y-4">
              {friendRequests.map((request) => (
                <div key={request._id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {request.sender.avatar && (
                        <img
                          src={request.sender.avatar}
                          alt={request.sender.displayName}
                          className="w-12 h-12 rounded-full"
                        />
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">
                          {request.sender.displayName}
                        </p>
                        <p className="text-sm text-gray-500">@{request.sender.username}</p>
                        {request.message && (
                          <p className="text-sm text-gray-600 mt-1">{request.message}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleFriendRequest(request._id, 'accept')}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 cursor-pointer"
                      >
                        ยอมรับ
                      </button>
                      <button
                        onClick={() => handleFriendRequest(request._id, 'decline')}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 cursor-pointer"
                      >
                        ปฏิเสธ
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Friends() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    }>
      <FriendsContent />
    </Suspense>
  );
}
