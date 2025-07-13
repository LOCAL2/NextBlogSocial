'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useSocket } from './SocketProvider';
import AdvancedCommentSection from './AdvancedCommentSection';
import EnhancedRoleBadge from './EnhancedRoleBadge';
import ImageModal from './ImageModal';
import { useToast } from './Toast';
import { useUserUpdates } from '../hooks/useUserUpdates';
import { formatDate } from '../utils/dateUtils';

export default function PostCard({ post, onUpdate }) {
  const { data: session } = useSession();
  const { socket } = useSocket();
  const toast = useToast();
  // Note: useUserUpdates is handled at app level to prevent component re-renders
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [loading, setLoading] = useState(false);
  const [currentPost, setCurrentPost] = useState(post);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isEditingVisibility, setIsEditingVisibility] = useState(false);
  const [editVisibility, setEditVisibility] = useState(post.visibility || 'public');

  useEffect(() => {
    setCurrentPost(post);
    setEditContent(post.content);
    setLikesCount(post.likes?.length || 0);

    // Check if current user liked this post
    if (session?.user?.discordId && post.likes) {
      const userLike = post.likes.find(like =>
        like.user?.discordId === session.user.discordId ||
        like.user?._id === session.user.id ||
        like.user === session.user.id
      );
      setIsLiked(!!userLike);
    }
  }, [post, session]);

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    const handlePostLiked = (data) => {
      if (data.postId === currentPost._id) {
        setLikesCount(data.likesCount);
        // Don't update isLiked here as it should only reflect current user's like status
      }
    };

    socket.on('post-liked', handlePostLiked);

    return () => {
      socket.off('post-liked', handlePostLiked);
    };
  }, [socket, currentPost._id]);

  useEffect(() => {
    if (socket) {
      const handlePostUpdate = (updatedPost) => {
        if (updatedPost._id === currentPost._id) {
          setCurrentPost(updatedPost);
          setEditContent(updatedPost.content);
          setIsEditing(false);
        }
      };

      const handlePostDelete = (data) => {
        if (data.postId === currentPost._id) {
          onUpdate();
        }
      };

      const handlePostLike = (data) => {
        if (data.postId === currentPost._id) {
          setLikesCount(data.likesCount);
        }
      };

      const handleUserUpdated = (data) => {
        // Update post author badges when user data changes
        if (currentPost.author._id === data.userId) {
          setCurrentPost(prev => ({
            ...prev,
            author: {
              ...prev.author,
              publicTitles: data.publicTitles || [],
              customBadges: data.customBadges || prev.author.customBadges,
              role: data.role || prev.author.role
            }
          }));
        }
      };

      socket.on('post-updated', handlePostUpdate);
      socket.on('post-deleted', handlePostDelete);
      socket.on('post-liked', handlePostLike);
      socket.on('user-updated', handleUserUpdated);

      return () => {
        socket.off('post-updated', handlePostUpdate);
        socket.off('post-deleted', handlePostDelete);
        socket.off('post-liked', handlePostLike);
        socket.off('user-updated', handleUserUpdated);
      };
    }
  }, [socket, currentPost._id, onUpdate]);

  const canEdit = session && (currentPost.author._id === session.user.id || session.user.role === 'admin');
  const canDelete = session && (currentPost.author._id === session.user.id || session.user.role === 'admin');

  // Visibility settings
  const getVisibilityInfo = (visibility) => {
    switch (visibility) {
      case 'public':
        return { icon: '🌍', label: 'สาธารณะ', color: 'text-green-600' };
      case 'followers':
        return { icon: '👥', label: 'เฉพาะผู้ติดตาม', color: 'text-blue-600' };
      case 'private':
        return { icon: '🔒', label: 'ส่วนตัว', color: 'text-gray-600' };
      default:
        return { icon: '🌍', label: 'สาธารณะ', color: 'text-green-600' };
    }
  };

  const visibilityInfo = getVisibilityInfo(currentPost.visibility);

  const handleEdit = async () => {
    if (!editContent.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/posts/${currentPost._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editContent.trim() }),
      });

      if (response.ok) {
        setIsEditing(false);
        toast.success('แก้ไขโพสต์สำเร็จ');
        onUpdate();
      } else {
        const error = await response.json();
        toast.error(error.error || 'เกิดข้อผิดพลาดในการแก้ไข');
      }
    } catch (error) {
      console.error('Error editing post:', error);
      toast.error('เกิดข้อผิดพลาดในการแก้ไข');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    // Create custom confirmation modal using DaisyUI
    const modal = document.createElement('div');
    modal.className = 'modal modal-open';
    modal.innerHTML = `
      <div class="modal-box">
        <h3 class="font-bold text-lg">ยืนยันการลบโพสต์</h3>
        <p class="py-4">คุณแน่ใจหรือไม่ที่จะลบโพสต์นี้? การกระทำนี้ไม่สามารถยกเลิกได้</p>
        <div class="modal-action">
          <button class="btn btn-ghost" id="cancel-delete">ยกเลิก</button>
          <button class="btn btn-error" id="confirm-delete">ลบโพสต์</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const confirmDelete = () => {
      return new Promise((resolve) => {
        modal.querySelector('#confirm-delete').onclick = () => {
          document.body.removeChild(modal);
          resolve(true);
        };
        modal.querySelector('#cancel-delete').onclick = () => {
          document.body.removeChild(modal);
          resolve(false);
        };
      });
    };

    const confirmed = await confirmDelete();
    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/posts/${currentPost._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('ลบโพสต์สำเร็จ');
        onUpdate();
      } else {
        const error = await response.json();
        toast.error(error.error || 'เกิดข้อผิดพลาดในการลบ');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('เกิดข้อผิดพลาดในการลบ');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!session) {
      toast.warning('กรุณาเข้าสู่ระบบเพื่อกดไลค์');
      return;
    }

    setLikeLoading(true);
    try {
      const response = await fetch(`/api/posts/${currentPost._id}/like`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.isLiked);
        setLikesCount(data.likesCount);
      } else if (response.status === 404) {
        toast.info('โพสต์ถูกลบแล้ว');
        // Optionally refresh the page or remove the post from UI
      } else {
        const error = await response.json();
        toast.error(error.error || 'เกิดข้อผิดพลาดในการกดไลค์');
      }
    } catch (error) {
      console.error('Error liking post:', error);
      toast.error('เกิดข้อผิดพลาดในการกดไลค์');
    } finally {
      setLikeLoading(false);
    }
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const handleVisibilityEdit = async () => {
    if (!session) {
      toast.warning('กรุณาเข้าสู่ระบบ');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/posts/${currentPost._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visibility: editVisibility
        }),
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setCurrentPost(updatedPost);
        setIsEditingVisibility(false);
        toast.success('อัปเดตกลุ่มเป้าหมายสำเร็จ');
        if (onUpdate) onUpdate();
      } else {
        const error = await response.json();
        toast.error(error.error || 'เกิดข้อผิดพลาดในการอัปเดต');
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast.error('เกิดข้อผิดพลาดในการอัปเดต');
    } finally {
      setLoading(false);
    }
  };

  const cancelVisibilityEdit = () => {
    setEditVisibility(currentPost.visibility || 'public');
    setIsEditingVisibility(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'เมื่อสักครู่';

    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'เมื่อสักครู่';
    }

    try {
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'เมื่อสักครู่';
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl mb-6">
      <div className="card-body">
        {/* Post header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="avatar">
              <div className="w-12 rounded-full">
                {currentPost.author.avatar ? (
                  <img src={currentPost.author.avatar} alt={currentPost.author.displayName} />
                ) : (
                  <div className="bg-neutral text-neutral-content rounded-full w-12 h-12 flex items-center justify-center">
                    <span className="text-lg">{currentPost.author.displayName?.charAt(0)}</span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/profile/${currentPost.author.username}`}
                  className="font-semibold text-base-content hover:text-primary link link-hover"
                >
                  {currentPost.author.displayName}
                </Link>
                <EnhancedRoleBadge
                role={currentPost.author.role}
                customBadges={currentPost.author.customBadges || []}
                publicTitles={currentPost.author.publicTitles || []}
                size="xs"
              />
              </div>
              <p className="text-sm text-base-content/70">@{currentPost.author.username}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex flex-col items-end">
              <span className="text-sm text-base-content/60">
                {formatDate(currentPost.createdAt)}
                {currentPost.isEdited && <span className="ml-1">(แก้ไขแล้ว)</span>}
              </span>
              {/* Visibility indicator */}
              <div className={`flex items-center gap-1 text-xs ${visibilityInfo.color} mt-1`}>
                <span>{visibilityInfo.icon}</span>
                <span>{visibilityInfo.label}</span>
              </div>
            </div>

            {(canEdit || canDelete) && (
              <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="btn btn-ghost btn-xs">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </div>
                <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-40">
                  {canEdit && !isEditing && (
                    <li>
                      <button onClick={() => setIsEditing(true)} disabled={loading}>
                        แก้ไข
                      </button>
                    </li>
                  )}
                  {canEdit && !isEditingVisibility && (
                    <li>
                      <button onClick={() => setIsEditingVisibility(true)} disabled={loading}>
                        กลุ่มเป้าหมาย
                      </button>
                    </li>
                  )}
                  {canDelete && (
                    <li>
                      <button onClick={handleDelete} disabled={loading} className="text-error">
                        ลบ
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Post content */}
        {isEditing ? (
          <div className="mb-4">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="textarea textarea-bordered w-full"
              rows="4"
              maxLength="2000"
              disabled={loading}
            />
            <div className="flex justify-end space-x-2 mt-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(currentPost.content);
                }}
                className="btn btn-ghost btn-sm"
                disabled={loading}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleEdit}
                className="btn btn-primary btn-sm"
                disabled={loading || !editContent.trim()}
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    กำลังบันทึก...
                  </>
                ) : (
                  'บันทึก'
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <p className="text-base-content whitespace-pre-wrap">{currentPost.content}</p>
          </div>
        )}

        {/* Visibility editing */}
        {isEditingVisibility && (
          <div className="mb-4 p-4 border border-base-300 rounded-lg bg-base-50">
            <h4 className="font-semibold mb-3">แก้ไขกลุ่มเป้าหมาย</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {[
                { value: 'public', label: 'สาธารณะ', icon: '🌍', description: 'ทุกคนสามารถเห็นโพสต์นี้ได้' },
                { value: 'followers', label: 'เฉพาะผู้ติดตาม', icon: '👥', description: 'เฉพาะผู้ที่ติดตามคุณเท่านั้น' },
                { value: 'private', label: 'ส่วนตัว', icon: '🔒', description: 'เฉพาะคุณเท่านั้นที่เห็นได้' }
              ].map((option) => (
                <label key={option.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="editVisibility"
                    value={option.value}
                    checked={editVisibility === option.value}
                    onChange={(e) => setEditVisibility(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`card border-2 transition-all ${
                    editVisibility === option.value
                      ? 'border-primary bg-primary/10'
                      : 'border-base-300 hover:border-primary/50'
                  }`}>
                    <div className="card-body p-3 text-center">
                      <div className="text-xl mb-1">{option.icon}</div>
                      <h5 className="font-semibold text-sm">{option.label}</h5>
                      <p className="text-xs text-base-content/60 mt-1">{option.description}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={cancelVisibilityEdit}
                className="btn btn-ghost btn-sm"
                disabled={loading}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleVisibilityEdit}
                className="btn btn-primary btn-sm"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    กำลังบันทึก...
                  </>
                ) : (
                  'บันทึก'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Post images */}
        {currentPost.images && currentPost.images.length > 0 && (
          <div className="mb-4">
            <div className={`gap-2 ${currentPost.images.length === 1 ? 'flex' : 'grid grid-cols-2'}`}>
              {currentPost.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Post image ${index + 1}`}
                  className={`rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity ${
                    currentPost.images.length === 1 ? 'max-h-96 max-w-lg' : 'max-h-64'
                  }`}
                  onClick={() => handleImageClick(image)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Post actions */}
        <div className="card-actions justify-start">
          <button
            onClick={handleLike}
            disabled={likeLoading}
            className={`btn btn-ghost btn-sm ${isLiked ? 'text-red-500' : ''}`}
          >
            {likeLoading ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <svg
                className="w-5 h-5"
                fill={isLiked ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
            {likesCount}
          </button>
        </div>

        {/* Comments section */}
        {session ? (
          <AdvancedCommentSection
            postId={currentPost._id}
            initialComments={currentPost.comments || []}
          />
        ) : (
          <>
            <div className="divider"></div>
            <div className="text-center py-4">
              <p className="text-base-content/70 mb-2">เข้าสู่ระบบเพื่อดูและเขียนคอมเมนต์</p>
              <Link href="/auth/signin" className="btn btn-primary btn-sm">
                เข้าสู่ระบบ
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        imageUrl={selectedImage}
        alt="Post image"
      />
    </div>
  );
}
