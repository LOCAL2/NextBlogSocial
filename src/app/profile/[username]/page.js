'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import PostCard from '../../../components/PostCard';
import EnhancedRoleBadge from '../../../components/EnhancedRoleBadge';
import FollowButton from '../../../components/FollowButton';
import { useSocket } from '../../../components/SocketProvider';

export default function UserProfile() {
  const { data: session } = useSession();
  const { socket } = useSocket();
  const params = useParams();
  const [user, setUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.username) {
      fetchUserProfile();
    }
  }, [params.username, session]);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (socket) {
      const handlePostUpdate = (data) => {
        console.log('📝 Profile: Received post-updated event:', data);
        setUserPosts(prevPosts =>
          prevPosts.map(post =>
            post._id === data.postId ? data.updatedPost : post
          )
        );
      };

      const handlePostDelete = (data) => {
        console.log('🗑️ Profile: Received post-deleted event:', data);
        setUserPosts(prevPosts =>
          prevPosts.filter(post => post._id !== data.postId)
        );
      };

      const handlePostHidden = (data) => {
        console.log('🔒 Profile: Received post-hidden event:', data);
        // Check if current user should still see this post
        if (session?.user?.id !== data.authorId) {
          // If not the author, remove the post from view
          setUserPosts(prevPosts =>
            prevPosts.filter(post => post._id !== data.postId)
          );
        }
      };

      const handlePostShown = (data) => {
        console.log('🌍 Profile: Received post-shown event:', data);
        // Check if current user should see this post and if it's for this profile
        if (session?.user?.id !== data.authorId && user && data.authorId === user._id) {
          // If not the author but viewing their profile, add the post to view
          setUserPosts(prevPosts => {
            const exists = prevPosts.some(post => post._id === data.postId);
            if (!exists) {
              // Add the post in chronological order
              const newPosts = [...prevPosts, data.newPost];
              return newPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }
            return prevPosts;
          });
        }
      };

      socket.on('post-updated', handlePostUpdate);
      socket.on('post-deleted', handlePostDelete);
      socket.on('post-hidden', handlePostHidden);
      socket.on('post-shown', handlePostShown);

      return () => {
        socket.off('post-updated', handlePostUpdate);
        socket.off('post-deleted', handlePostDelete);
        socket.off('post-hidden', handlePostHidden);
        socket.off('post-shown', handlePostShown);
      };
    }
  }, [socket, session]);

  const fetchUserProfile = async () => {
    try {
      // Fetch user profile
      const userResponse = await fetch(`/api/users/${params.username}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);



        // Fetch user's posts
        const postsResponse = await fetch(`/api/posts?userId=${userData._id}`);
        if (postsResponse.ok) {
          const postsData = await postsResponse.json();
          setUserPosts(postsData);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">ไม่พบผู้ใช้</h1>
        <p className="text-gray-600">ผู้ใช้ที่คุณค้นหาไม่มีอยู่ในระบบ</p>
      </div>
    );
  }

  const isOwnProfile = session?.user?.id === user._id;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center space-x-6">
          {user.avatar && (
            <img
              src={user.avatar}
              alt={user.displayName}
              className="w-24 h-24 rounded-full"
            />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{user.displayName}</h1>
              <EnhancedRoleBadge
                role={user.role}
                customBadges={user.customBadges || []}
                publicTitles={user.publicTitles || []}
                size="sm"
              />
            </div>
            <p className="text-lg text-gray-600">@{user.username}</p>
            {user.bio && (
              <p className="text-gray-700 mt-2">{user.bio}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              เข้าร่วมเมื่อ {formatDate(user.createdAt)}
            </p>
          </div>
          
          {!isOwnProfile && session && (
            <div>
              <FollowButton
                targetUserId={user._id}
                targetUsername={user.displayName}
              />
            </div>
          )}
        </div>
      </div>

      {/* User's Posts */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">
          โพสต์ของ {user.displayName}
        </h2>
        
        {userPosts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {isOwnProfile ? 'คุณยังไม่มีโพสต์' : `${user.displayName} ยังไม่มีโพสต์`}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {userPosts.map((post) => (
              <PostCard key={post._id} post={post} onUpdate={fetchUserProfile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
