'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PostCard from '../../components/PostCard';
import FollowButton from '../../components/FollowButton';
import EnhancedRoleBadge from '../../components/EnhancedRoleBadge';
function SearchContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState({ users: [], posts: [] });
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);



  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}&type=all`);
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      performSearch(query.trim());
      // Update URL
      window.history.pushState({}, '', `/search?q=${encodeURIComponent(query.trim())}`);
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

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p>กรุณาเข้าสู่ระบบเพื่อค้นหา</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">ค้นหา</h1>

      {/* Search form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 p-3 border border-gray-500 rounded-l-lg"
            placeholder="ค้นหาโพสต์หรือผู้ใช้..."
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-3 rounded-r-lg hover:bg-indigo-700"
            disabled={loading}
          >
            {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
          </button>
        </div>
      </form>

      {/* Results */}
      {query && (
        <>
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'all'
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-white hover:text-base-content hover:border-base-300'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-white hover:text-base-content hover:border-base-300'
                }`}
              >
                ผู้ใช้ ({results.users.length})
              </button>
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'posts'
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-white hover:text-base-content hover:border-base-300'
                }`}
              >
                โพสต์ ({results.posts.length})
              </button>
            </nav>
          </div>

          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              {/* Users results */}
              {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-base-content mb-4">ผู้ใช้</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.users.map((user) => (
                      <div key={user._id} className="bg-black rounded-lg shadow-md p-6">
                        <div className="flex items-center space-x-4 mb-4">
                          {user.avatar && (
                            <img
                              src={user.avatar}
                              alt={user.displayName}
                              className="w-12 h-12 rounded-full"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/profile/${user.username}`}
                                className="font-semibold text-base-content hover:text-primary"
                              >
                                {user.displayName}
                              </Link>
                              <EnhancedRoleBadge
                                role={user.role}
                                customBadges={user.customBadges || []}
                                publicTitles={user.publicTitles || []}
                                size="xs"
                              />
                            </div>
                            <p className="text-sm text-base-content/70">@{user.username}</p>
                          </div>
                        </div>
                        {user.bio && (
                          <p className="text-sm text-base-content/80 mb-4">{user.bio}</p>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-base-content/60">
                            เข้าร่วมเมื่อ {formatDate(user.createdAt)}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <FollowButton
                            targetUserId={user._id}
                            targetUsername={user.displayName}
                          />
                          <Link
                            href={`/profile/${user.username}`}
                            className="btn btn-outline btn-sm flex-1"
                          >
                            ดูโปรไฟล์
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts results */}
              {(activeTab === 'all' || activeTab === 'posts') && results.posts.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-base-content mb-4">โพสต์</h2>
                  <div className="space-y-6">
                    {results.posts.map((post) => (
                      <PostCard key={post._id} post={post} onUpdate={() => performSearch(query)} />
                    ))}
                  </div>
                </div>
              )}

              {/* No results */}
              {results.users.length === 0 && results.posts.length === 0 && !loading && (
                <div className="text-center py-8">
                  <p className="text-base-content/60">ไม่พบผลการค้นหาสำหรับ &quot;{query}&quot;</p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function Search() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
