'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PostCard from '../../components/PostCard';
import EnhancedRoleBadge from '../../components/EnhancedRoleBadge';
import { useUserUpdates } from '../../hooks/useUserUpdates';

export default function Profile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  useUserUpdates(); // Enable real-time user updates
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    postsCount: 0,
    followersCount: 0,
    followingCount: 0
  });

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    fetchUserData();
  }, [session, status, router]);

  const fetchUserData = async () => {
    try {
      // Fetch user's posts
      const postsResponse = await fetch(`/api/posts?userId=${session.user.id}`);
      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        setUserPosts(postsData);
        setStats(prev => ({ ...prev, postsCount: postsData.length }));
      }

      // Fetch followers count
      const followersResponse = await fetch('/api/follow?type=followers');
      if (followersResponse.ok) {
        const followersData = await followersResponse.json();
        setStats(prev => ({ ...prev, followersCount: followersData.followers.length }));
      }

      // Fetch following count
      const followingResponse = await fetch('/api/follow?type=following');
      if (followingResponse.ok) {
        const followingData = await followingResponse.json();
        setStats(prev => ({ ...prev, followingCount: followingData.following.length }));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };



  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center space-x-6">
          {session.user.image && (
            <img
              src={session.user.image}
              alt={session.user.name}
              className="w-24 h-24 rounded-full"
            />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{session.user.name}</h1>
              <EnhancedRoleBadge
                role={session.user.role}
                customBadges={session.user.customBadges || []}
                publicTitles={session.user.publicTitles || []}
                size="sm"
              />
            </div>
            <p className="text-lg text-gray-600">@{session.user.username}</p>
            <p className="text-sm text-gray-500 mt-2">
              เข้าร่วมเมื่อ {formatDate(session.user.createdAt || new Date())}
            </p>

            
            {/* Stats */}
            <div className="flex space-x-6 mt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{stats.postsCount}</div>
                <div className="text-sm text-gray-500">โพสต์</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{stats.followersCount}</div>
                <div className="text-sm text-gray-500">ผู้ติดตาม</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{stats.followingCount}</div>
                <div className="text-sm text-gray-500">กำลังติดตาม</div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => router.push('/create-post')}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
            >
              สร้างโพสต์ใหม่
            </button>
            <button
              onClick={() => router.push('/following')}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
            >
              จัดการการติดตาม
            </button>
          </div>
        </div>
      </div>

      {/* User's Posts */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">โพสต์ของฉัน</h2>
        
        {userPosts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">คุณยังไม่มีโพสต์</p>
            <button
              onClick={() => router.push('/create-post')}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
            >
              สร้างโพสต์แรกของคุณ
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {userPosts.map((post) => (
              <PostCard key={post._id} post={post} onUpdate={fetchUserData} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
