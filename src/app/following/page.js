'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import FollowButton from '../../components/FollowButton';
import EnhancedRoleBadge from '../../components/EnhancedRoleBadge';

export default function Following() {
  const { data: session, status } = useSession();
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('following');

  const fetchFollowing = async () => {
    try {
      const response = await fetch('/api/follow?type=following');
      if (response.ok) {
        const data = await response.json();
        setFollowing(data.following);
      }
    } catch (error) {
      console.error('Error fetching following:', error);
    }
  };

  const fetchFollowers = async () => {
    try {
      const response = await fetch('/api/follow?type=followers');
      if (response.ok) {
        const data = await response.json();
        setFollowers(data.followers);
      }
    } catch (error) {
      console.error('Error fetching followers:', error);
    }
  };

  useEffect(() => {
    if (session) {
      Promise.all([fetchFollowing(), fetchFollowers()]).finally(() => {
        setLoading(false);
      });
    }
  }, [session]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">กรุณาเข้าสู่ระบบ</h1>
          <p className="text-gray-600">คุณต้องเข้าสู่ระบบเพื่อดูรายการติดตาม</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">การติดตาม</h1>

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-6">
          <button
            className={`tab ${activeTab === 'following' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('following')}
          >
            กำลังติดตาม ({following.length})
          </button>
          <button
            className={`tab ${activeTab === 'followers' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('followers')}
          >
            ผู้ติดตาม ({followers.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <div>
            {/* Following Tab */}
            {activeTab === 'following' && (
              <div>
                {following.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">คุณยังไม่ได้ติดตามใครเลย</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {following.map((user) => (
                      <div key={user._id} className="card bg-base-200 shadow-md">
                        <div className="card-body p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="avatar">
                                <div className="w-12 h-12 rounded-full">
                                  <img
                                    src={user.avatar || '/default-avatar.png'}
                                    alt={user.displayName}
                                  />
                                </div>
                              </div>
                              <div>
                                <Link
                                  href={`/profile/${user._id}`}
                                  className="font-semibold hover:link"
                                >
                                  {user.displayName}
                                </Link>
                                <div className="flex items-center gap-2 mt-1">
                                  <EnhancedRoleBadge user={user} />
                                </div>
                              </div>
                            </div>
                            <FollowButton
                              targetUserId={user._id}
                              targetUsername={user.displayName}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Followers Tab */}
            {activeTab === 'followers' && (
              <div>
                {followers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">ยังไม่มีใครติดตามคุณ</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {followers.map((user) => (
                      <div key={user._id} className="card bg-base-200 shadow-md">
                        <div className="card-body p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="avatar">
                                <div className="w-12 h-12 rounded-full">
                                  <img
                                    src={user.avatar || '/default-avatar.png'}
                                    alt={user.displayName}
                                  />
                                </div>
                              </div>
                              <div>
                                <Link
                                  href={`/profile/${user._id}`}
                                  className="font-semibold hover:link"
                                >
                                  {user.displayName}
                                </Link>
                                <div className="flex items-center gap-2 mt-1">
                                  <EnhancedRoleBadge user={user} />
                                </div>
                              </div>
                            </div>
                            <FollowButton
                              targetUserId={user._id}
                              targetUsername={user.displayName}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
