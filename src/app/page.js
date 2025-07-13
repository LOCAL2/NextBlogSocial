'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PostCard from '../components/PostCard';
import { useSocket } from '../components/SocketProvider';

export default function Home() {
  const { data: session, status } = useSession();
  const { socket } = useSocket();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [session]);

  useEffect(() => {
    if (socket) {
      const handleNewPost = (newPost) => {
        setPosts(prevPosts => [newPost, ...prevPosts]);
      };

      const handlePostUpdate = (data) => {
        console.log('📝 Received post-updated event:', data);
        setPosts(prevPosts =>
          prevPosts.map(post =>
            post._id === data.postId ? data.updatedPost : post
          )
        );
      };

      const handlePostDelete = (data) => {
        console.log('🗑️ Received post-deleted event:', data);
        setPosts(prevPosts =>
          prevPosts.filter(post => post._id !== data.postId)
        );
      };

      const handlePostHidden = (data) => {
        console.log('🔒 Received post-hidden event:', data);
        // Check if current user should still see this post
        if (session?.user?.id !== data.authorId) {
          // If not the author, remove the post from view
          setPosts(prevPosts =>
            prevPosts.filter(post => post._id !== data.postId)
          );
        }
      };

      const handlePostShown = (data) => {
        console.log('🌍 Received post-shown event:', data);
        // Check if current user should see this post
        if (session?.user?.id !== data.authorId) {
          // If not the author, add the post to view (if not already there)
          setPosts(prevPosts => {
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

      const handleFollowUpdated = (data) => {
        console.log('👥 Received follow-updated event:', data);
        console.log('🔍 Current user ID:', session?.user?.id);
        console.log('🔍 Event follower ID:', data.followerId);

        // If current user is the one who followed/unfollowed, refresh posts
        if (session?.user?.id === data.followerId) {
          console.log('🔄 Refreshing posts due to follow/unfollow action');
          fetchPosts();
        } else {
          console.log('❌ Not refreshing - user IDs do not match');
        }
      };

      socket.on('new-post', handleNewPost);
      socket.on('post-updated', handlePostUpdate);
      socket.on('post-deleted', handlePostDelete);
      socket.on('post-hidden', handlePostHidden);
      socket.on('post-shown', handlePostShown);
      socket.on('follow-updated', handleFollowUpdated);

      return () => {
        socket.off('new-post', handleNewPost);
        socket.off('post-updated', handlePostUpdate);
        socket.off('post-deleted', handlePostDelete);
        socket.off('post-hidden', handlePostHidden);
        socket.off('post-shown', handlePostShown);
        socket.off('follow-updated', handleFollowUpdated);
      };
    }
  }, [socket]);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts/public');
      if (response.ok) {
        const data = await response.json();
        // Handle both old format (array) and new format (object with posts property)
        if (Array.isArray(data)) {
          setPosts(data);
        } else if (data.posts && Array.isArray(data.posts)) {
          setPosts(data.posts);
        } else {
          setPosts([]);
        }
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }



  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-base-content mb-4">ฟีดหลัก</h1>
        {!session ? (
          <div className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>ยินดีต้อนรับสู่ NextBlog Social! เข้าสู่ระบบเพื่อสร้างโพสต์และเชื่อมต่อกับเพื่อน</span>
            <div>
              <Link href="/auth/signin" className="btn btn-sm btn-primary">
                เข้าสู่ระบบ
              </Link>
            </div>
          </div>
        ) : (
          <Link href="/create-post" className="btn btn-primary">
            สร้างโพสต์ใหม่
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8">
          <div className="hero bg-base-200 rounded-lg">
            <div className="hero-content text-center">
              <div className="max-w-md">
                <h1 className="text-2xl font-bold">ยังไม่มีโพสต์</h1>
                <p className="py-6">เริ่มต้นด้วยการสร้างโพสต์แรกของคุณ!</p>
                {session && (
                  <Link href="/create-post" className="btn btn-primary">
                    สร้างโพสต์แรก
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} onUpdate={fetchPosts} />
          ))}
        </div>
      )}
    </div>
  );
}
