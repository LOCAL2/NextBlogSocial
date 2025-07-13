'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import EnhancedRoleBadge from './EnhancedRoleBadge';
import ImageModal from './ImageModal';
import { useToast } from './Toast';
import { useSocket } from './SocketProvider';
import { useUserUpdates } from '../hooks/useUserUpdates';
import { formatDate } from '../utils/dateUtils';

export default function AdvancedCommentSection({ postId, initialComments = [] }) {
  const { data: session } = useSession();
  const toast = useToast();
  const { socket } = useSocket();
  // Note: useUserUpdates is handled at app level to prevent component re-renders
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState({});
  const [uploadedImages, setUploadedImages] = useState([]);
  const [replyImages, setReplyImages] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [showDropdown, setShowDropdown] = useState(null);

  // Real-time comment updates
  useEffect(() => {
    if (!socket) return;

    const handleCommentAdded = (data) => {
      if (data.postId === postId) {
        if (data.comment.parentComment) {
          // This is a reply
          setComments(prev => prev.map(comment => {
            if (comment._id === data.comment.parentComment) {
              // Check if reply already exists (avoid duplicates)
              const replyExists = comment.replies?.some(reply =>
                reply._id === data.comment._id ||
                (reply.isOptimistic && reply.content === data.comment.content)
              );

              if (!replyExists) {
                return { ...comment, replies: [...(comment.replies || []), data.comment] };
              } else {
                // Replace optimistic reply with real one
                return {
                  ...comment,
                  replies: comment.replies.map(reply =>
                    reply.isOptimistic && reply.content === data.comment.content
                      ? data.comment
                      : reply
                  )
                };
              }
            }
            return comment;
          }));
        } else {
          // This is a new comment
          setComments(prev => {
            // Check if comment already exists (avoid duplicates)
            const commentExists = prev.some(comment =>
              comment._id === data.comment._id ||
              (comment.isOptimistic && comment.content === data.comment.content)
            );

            if (!commentExists) {
              return [data.comment, ...prev];
            } else {
              // Replace optimistic comment with real one
              return prev.map(comment =>
                comment.isOptimistic && comment.content === data.comment.content
                  ? data.comment
                  : comment
              );
            }
          });
        }
      }
    };

    const handleCommentLiked = (data) => {
      console.log('🔔 Received comment-liked event:', data);
      setComments(prev => {
        const updated = prev.map(comment => {
          if (comment._id === data.commentId) {
            console.log('📝 Updating main comment:', comment._id);
            return {
              ...comment,
              likesCount: data.likesCount,
              likes: data.likes || comment.likes || [] // Use updated likes array from server
            };
          }
          // Check replies too
          if (comment.replies) {
            const updatedReplies = comment.replies.map(reply => {
              if (reply._id === data.commentId) {
                console.log('📝 Updating reply comment:', reply._id);
                return {
                  ...reply,
                  likesCount: data.likesCount,
                  likes: data.likes || reply.likes || []
                };
              }
              return reply;
            });
            return {
              ...comment,
              replies: updatedReplies
            };
          }
          return comment;
        });
        console.log('🔄 Comments updated via socket event');
        return updated;
      });
    };

    const handleUserUpdated = (data) => {
      console.log('AdvancedCommentSection: Received user-updated event:', data);

      // Update user badges in all comments when user data changes
      setComments(prev => {
        const updatedComments = prev.map(comment => {
          let updatedComment = comment;

          // Update main comment author
          if (comment.author._id === data.userId) {
            console.log(`Updating comment author ${comment.author.displayName} with new badges`);
            updatedComment = {
              ...comment,
              author: {
                ...comment.author,
                publicTitles: data.publicTitles || [],
                customBadges: data.customBadges || comment.author.customBadges,
                role: data.role || comment.author.role
              }
            };
          }

          // Update replies authors
          if (updatedComment.replies && updatedComment.replies.length > 0) {
            updatedComment = {
              ...updatedComment,
              replies: updatedComment.replies.map(reply =>
                reply.author._id === data.userId
                  ? {
                      ...reply,
                      author: {
                        ...reply.author,
                        publicTitles: data.publicTitles || [],
                        customBadges: data.customBadges || reply.author.customBadges,
                        role: data.role || reply.author.role
                      }
                    }
                  : reply
              )
            };
          }

          return updatedComment;
        });

        console.log('Updated comments:', updatedComments);
        return updatedComments;
      });
    };

    const handleCommentDeleted = (data) => {
      if (data.postId === postId) {
        setComments(prev => prev.map(comment => {
          if (comment._id === data.commentId) {
            return null; // Will be filtered out
          }
          // Check replies too
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.filter(reply => reply._id !== data.commentId)
            };
          }
          return comment;
        }).filter(Boolean));
      }
    };

    const handleCommentUpdated = (data) => {
      if (data.postId === postId) {
        setComments(prev => prev.map(comment => {
          if (comment._id === data.comment._id) {
            return { ...comment, ...data.comment };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map(reply =>
                reply._id === data.comment._id ? { ...reply, ...data.comment } : reply
              )
            };
          }
          return comment;
        }));
      }
    };

    console.log('🔌 Setting up socket listeners for AdvancedCommentSection');
    socket.on('comment-added', handleCommentAdded);
    socket.on('comment-liked', handleCommentLiked);
    socket.on('comment-deleted', handleCommentDeleted);
    socket.on('comment-updated', handleCommentUpdated);
    socket.on('user-updated', handleUserUpdated);

    return () => {
      socket.off('comment-added', handleCommentAdded);
      socket.off('comment-liked', handleCommentLiked);
      socket.off('comment-deleted', handleCommentDeleted);
      socket.off('comment-updated', handleCommentUpdated);
      socket.off('user-updated', handleUserUpdated);
    };
  }, [socket, postId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.relative')) {
        setShowDropdown(null);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleSubmitComment = async (e, isReply = false, commentId = null) => {
    e.preventDefault();

    if (!session) {
      toast.warning('กรุณาเข้าสู่ระบบ');
      return;
    }

    // Check if replying to a deleted comment and find root comment
    let rootCommentId = null;
    if (isReply && commentId) {
      // Find the comment we're replying to
      let targetComment = null;

      // Check if it's a main comment
      targetComment = comments.find(c => c._id === commentId);

      if (targetComment) {
        rootCommentId = targetComment._id;
        if (targetComment.isDeleted) {
          toast.error('ไม่สามารถตอบกลับความคิดเห็นที่ถูกลบแล้ว');
          setReplyingTo(null);
          return;
        }
      } else {
        // Check if it's a reply (nested comment)
        for (const comment of comments) {
          if (comment.replies) {
            const reply = comment.replies.find(r => r._id === commentId);
            if (reply) {
              targetComment = reply;
              rootCommentId = comment._id; // Use main comment ID as root
              if (reply.isDeleted) {
                toast.error('ไม่สามารถตอบกลับความคิดเห็นที่ถูกลบแล้ว');
                setReplyingTo(null);
                return;
              }
              break;
            }
          }
        }
      }

      if (!targetComment) {
        toast.error('ไม่พบความคิดเห็นที่ต้องการตอบกลับ');
        setReplyingTo(null);
        return;
      }
    }

    const content = isReply ? (replyContent[commentId] || '') : newComment;
    const images = isReply ? (replyImages[commentId] || []) : uploadedImages;

    // Allow comment with either content or images
    if (!content.trim() && (!images || images.length === 0)) return;

    // Create optimistic comment for immediate UI feedback
    const optimisticComment = {
      _id: `temp-${Date.now()}`, // Temporary ID
      content: content.trim() || '',
      images: images || [],
      author: {
        _id: session.user.id,
        username: session.user.username,
        displayName: session.user.displayName,
        avatar: session.user.avatar,
        role: session.user.role,
        customBadges: session.user.customBadges || [],
        publicTitles: session.user.publicTitles || []
      },
      likes: [],
      likesCount: 0,
      replies: [],
      createdAt: new Date().toISOString(),
      isOptimistic: true, // Flag to identify optimistic updates
      parentComment: isReply ? rootCommentId : null
    };

    // Optimistic update - show comment immediately
    if (isReply) {
      setComments(prev => prev.map(comment =>
        comment._id === rootCommentId
          ? { ...comment, replies: [...(comment.replies || []), optimisticComment] }
          : comment
      ));
    } else {
      setComments(prev => [optimisticComment, ...prev]);
    }

    // Clear form immediately for better UX
    if (isReply) {
      setReplyContent(prev => ({ ...prev, [commentId]: '' }));
      setReplyingTo(null);
      setReplyImages(prev => ({ ...prev, [commentId]: [] }));
    } else {
      setNewComment('');
      setUploadedImages([]);
    }

    setLoading(true);
    try {
      const requestData = {
        postId,
        content: content.trim() || '',
        images: images || [],
        parentCommentId: isReply ? rootCommentId : null,
      };

      console.log('📤 Sending comment request:', {
        isReply,
        replyingTo,
        parentCommentId: requestData.parentCommentId,
        postId: requestData.postId
      });

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const realComment = await response.json();
        if (isReply) {
          setComments(prev => prev.map(comment =>
            comment._id === rootCommentId
              ? {
                  ...comment,
                  replies: comment.replies.map(reply =>
                    reply._id === optimisticComment._id ? realComment : reply
                  )
                }
              : comment
          ));
        } else {
          setComments(prev => prev.map(comment =>
            comment._id === optimisticComment._id ? realComment : comment
          ));
        }

      } else {
        if (isReply) {
          setComments(prev => prev.map(comment =>
            comment._id === rootCommentId
              ? {
                  ...comment,
                  replies: comment.replies.filter(reply => reply._id !== optimisticComment._id)
                }
              : comment
          ));
        } else {
          setComments(prev => prev.filter(comment => comment._id !== optimisticComment._id));
        }

        // Restore form content on error
        if (isReply) {
          setReplyContent(prev => ({ ...prev, [commentId]: content }));
          setReplyingTo(commentId); // Use original commentId
          setReplyImages(prev => ({ ...prev, [commentId]: images }));
        } else {
          setNewComment(content);
          setUploadedImages(images);
        }

        const error = await response.json();
        toast.error(error.error || 'เกิดข้อผิดพลาดในการส่งคอมเมนต์');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);

      // Remove optimistic comment on error
      if (isReply) {
        setComments(prev => prev.map(comment =>
          comment._id === rootCommentId
            ? {
                ...comment,
                replies: comment.replies.filter(reply => reply._id !== optimisticComment._id)
              }
            : comment
        ));
      } else {
        setComments(prev => prev.filter(comment => comment._id !== optimisticComment._id));
      }

      // Restore form content on error
      if (isReply) {
        setReplyContent(prev => ({ ...prev, [commentId]: content }));
        setReplyingTo(commentId); // Use original commentId
        setReplyImages(prev => ({ ...prev, [commentId]: images }));
      } else {
        setNewComment(content);
        setUploadedImages(images);
      }

      toast.error('เกิดข้อผิดพลาดในการส่งคอมเมนต์');
    } finally {
      setLoading(false);
    }
  };

  const handleLikeComment = async (commentId) => {
    if (!session) {
      toast.warning('กรุณาเข้าสู่ระบบเพื่อกดไลค์');
      return;
    }

    try {
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method: 'POST',
      });

      if (response.ok) {
        // Real-time update will handle the UI change via socket
        console.log('Comment like request successful');
      } else if (response.status === 404) {
        // Comment was deleted, remove from UI
        setComments(prev => prev.map(comment => {
          if (comment._id === commentId) {
            return null; // Will be filtered out
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.filter(reply => reply._id !== commentId)
            };
          }
          return comment;
        }).filter(Boolean));
        toast.info('Comment ถูกลบแล้ว');
      } else {
        const error = await response.json();
        toast.error(error.error || 'เกิดข้อผิดพลาดในการกดไลค์');
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      toast.error('เกิดข้อผิดพลาดในการกดไลค์');
    }
  };

  const handleImageUpload = async (files, isReply = false, commentId = null) => {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('file', file);
    });

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (isReply && commentId) {
          setReplyImages(prev => ({
            ...prev,
            [commentId]: [...(prev[commentId] || []), data.url]
          }));
        } else {
          setUploadedImages(prev => [...prev, data.url]);
        }
        toast.success('อัปโหลดรูปภาพสำเร็จ');
      } else {
        toast.error('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
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

  const isCommentLiked = (comment) => {
    if (!session || !comment.likes) return false;
    return comment.likes.some(like => {
      const likeUserId = typeof like.user === 'string' ? like.user : like.user._id;
      return likeUserId === session.user.id;
    });
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const handleEditComment = (comment) => {
    setEditingComment(comment._id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async (commentId) => {
    if (!editContent.trim()) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editContent.trim()
        }),
      });

      if (response.ok) {
        const updatedComment = await response.json();

        // Update comment in state
        setComments(prev => prev.map(comment => {
          if (comment._id === commentId) {
            return { ...comment, ...updatedComment };
          }
          // Check replies too
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map(reply =>
                reply._id === commentId ? { ...reply, ...updatedComment } : reply
              )
            };
          }
          return comment;
        }));

        setEditingComment(null);
        setEditContent('');
        toast.success('แก้ไข comment สำเร็จ');
      } else {
        const error = await response.json();
        toast.error(error.error || 'เกิดข้อผิดพลาดในการแก้ไข comment');
      }
    } catch (error) {
      console.error('Error editing comment:', error);
      toast.error('เกิดข้อผิดพลาดในการแก้ไข comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    const isAdminDeletion = ['admin', 'dev'].includes(session?.user?.role) &&
                           comments.find(c => c._id === commentId || c.replies?.find(r => r._id === commentId))?.author._id !== session.user.id;

    if (isAdminDeletion) {
      setShowDeleteDialog(commentId);
      return;
    }

    // Direct deletion for own comments
    await performDelete(commentId, '');
  };

  const performDelete = async (commentId, reason = '') => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        // Remove comment from state
        setComments(prev => prev.map(comment => {
          if (comment._id === commentId) {
            return null; // Will be filtered out
          }
          // Check replies too
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.filter(reply => reply._id !== commentId)
            };
          }
          return comment;
        }).filter(Boolean));

        setShowDeleteDialog(null);
        setDeleteReason('');
        toast.success('ลบ comment สำเร็จ');
      } else {
        const error = await response.json();
        toast.error(error.error || 'เกิดข้อผิดพลาดในการลบ comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('เกิดข้อผิดพลาดในการลบ comment');
    }
  };

  const canEditComment = (comment) => {
    if (!session) return false;
    return comment.author._id === session.user.id || ['admin', 'dev'].includes(session.user.role);
  };

  const canDeleteComment = (comment) => {
    if (!session) return false;
    return comment.author._id === session.user.id || ['admin', 'dev'].includes(session.user.role);
  };

  const CommentItem = ({ comment, isReply = false, level = 0 }) => (
    <div className={`${isReply ? 'ml-8 border-l-2 border-base-300 pl-4' : ''} ${comment.isOptimistic ? 'opacity-70' : ''}`}>
      <div className="flex gap-3 mb-4">
        <div className="avatar">
          <div className="w-8 h-8 rounded-full">
            {comment.author.avatar ? (
              <img src={comment.author.avatar} alt={comment.author.displayName} />
            ) : (
              <div className="bg-neutral text-neutral-content rounded-full w-8 h-8 flex items-center justify-center">
                <span className="text-xs">{comment.author.displayName?.charAt(0)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1">
          <div className={`bg-base-200 rounded-lg p-3 relative ${comment.isOptimistic ? 'border border-dashed border-base-300' : ''}`}>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href={`/profile/${comment.author.username}`}
                className="font-semibold text-sm hover:text-primary link link-hover"
              >
                {comment.author.displayName}
              </Link>
              <EnhancedRoleBadge
                role={comment.author.role || 'user'}
                customBadges={comment.author.customBadges || []}
                publicTitles={comment.author.publicTitles || []}
                size="xs"
              />
              <time className="text-xs opacity-50">
                {formatDate(comment.createdAt)}
              </time>
              {comment.isEdited && (
                <span className="text-xs opacity-50">(แก้ไขแล้ว)</span>
              )}
              {comment.isOptimistic && (
                <span className="text-xs opacity-50 flex items-center gap-1">
                  <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  กำลังส่ง...
                </span>
              )}
            </div>

            {/* Dropdown Menu */}
            {(canEditComment(comment) || canDeleteComment(comment)) && (
              <div className="absolute top-2 right-2 z-10">
                <div className="relative">
                  <button
                    className="btn btn-ghost btn-xs btn-circle hover:bg-base-300 border border-base-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDropdown(showDropdown === comment._id ? null : comment._id);
                    }}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                  </button>

                  {showDropdown === comment._id && (
                    <div className="absolute right-0 top-8 bg-base-100 rounded-box z-50 w-32 p-2 shadow-lg border border-base-300">
                      {canEditComment(comment) && editingComment !== comment._id && (
                        <button
                          onClick={() => {
                            handleEditComment(comment);
                            setShowDropdown(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-base-200 rounded flex items-center gap-2 cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          แก้ไข
                        </button>
                      )}
                      {canDeleteComment(comment) && (
                        <button
                          onClick={() => {
                            handleDeleteComment(comment._id);
                            setShowDropdown(null);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-error hover:text-error-content rounded flex items-center gap-2 text-error cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          ลบ
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {editingComment === comment._id ? (
              <div className="mb-2">
                <textarea
                  key={`edit-${comment._id}`}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="textarea textarea-bordered w-full text-sm"
                  rows="3"
                  maxLength="500"
                  autoFocus
                  onFocus={(e) => {
                    // Set cursor to end of text
                    const len = e.target.value.length;
                    e.target.setSelectionRange(len, len);
                  }}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-base-content/60">
                    {editContent.length}/500
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingComment(null);
                        setEditContent('');
                      }}
                      className="btn btn-ghost btn-xs"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={() => handleSaveEdit(comment._id)}
                      className="btn btn-primary btn-xs"
                      disabled={!editContent.trim() || editContent === comment.content}
                    >
                      บันทึก
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap mb-2">{comment.content}</p>
            )}
            
            {comment.images && comment.images.length > 0 && (
              <div className={`gap-2 mb-2 ${comment.images.length === 1 ? 'flex' : 'grid grid-cols-2'}`}>
                {comment.images.map((image, index) => (
                  <img
                    key={`comment-image-${comment._id}-${index}`}
                    src={image}
                    alt="Comment image"
                    className={`rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity ${
                      comment.images.length === 1 ? 'max-h-48 max-w-xs' : 'max-h-32'
                    }`}
                    onClick={() => handleImageClick(image)}
                  />
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 mt-2 text-sm">
            <button
              onClick={() => handleLikeComment(comment._id)}
              className={`flex items-center gap-1 hover:text-red-500 cursor-pointer transition-colors ${
                isCommentLiked(comment) ? 'text-red-500' : 'text-base-content/60'
              }`}
            >
              <svg className="w-4 h-4" fill={isCommentLiked(comment) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {comment.likes?.length || 0}
            </button>
            
            {session && level < 5 && !comment.isDeleted && (
              <button
                onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                className="text-base-content/60 hover:text-primary cursor-pointer"
              >
                ตอบกลับ
              </button>
            )}
          </div>
          
          {replyingTo === comment._id && session && (
            <form onSubmit={(e) => handleSubmitComment(e, true, comment._id)} className="mt-3">
              <div className="flex gap-2">
                <textarea
                  key={`reply-${comment._id}`}
                  value={replyContent[comment._id] || ''}
                  onChange={(e) => setReplyContent(prev => ({
                    ...prev,
                    [comment._id]: e.target.value
                  }))}
                  className="textarea textarea-bordered textarea-sm flex-1"
                  rows="2"
                  placeholder={`ตอบกลับ ${comment.author.displayName}...`}
                  maxLength="500"
                  autoFocus
                  dir="ltr"
                  style={{ direction: 'ltr', textAlign: 'left' }}
                  onFocus={(e) => {
                    // Set cursor to end of text
                    const len = e.target.value.length;
                    e.target.setSelectionRange(len, len);
                  }}
                />
              </div>
              
              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload(e.target.files, true, comment._id)}
                    className="file-input file-input-bordered file-input-xs"
                  />
                  <span className="text-xs text-base-content/60">
                    {(replyContent[comment._id] || '').length}/500
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent(prev => ({ ...prev, [comment._id]: '' }));
                      setReplyImages(prev => ({ ...prev, [comment._id]: [] }));
                    }}
                    className="btn btn-ghost btn-xs"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={loading || (!(replyContent[comment._id] || '').trim() && (replyImages[comment._id] || []).length === 0)}
                    className="btn btn-primary btn-xs"
                  >
                    {loading ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      'ตอบกลับ'
                    )}
                  </button>
                </div>
              </div>
              
              {(replyImages[comment._id] || []).length > 0 && (
                <div className="flex gap-2 mt-2">
                  {(replyImages[comment._id] || []).map((image, index) => (
                    <div key={`reply-image-${comment._id}-${index}`} className="relative">
                      <img src={image} alt="Upload preview" className="w-16 h-16 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => setReplyImages(prev => ({
                          ...prev,
                          [comment._id]: (prev[comment._id] || []).filter((_, i) => i !== index)
                        }))}
                        className="absolute -top-1 -right-1 btn btn-circle btn-xs btn-error"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </form>
          )}
          
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4">
              {comment.replies.map((reply) => (
                <CommentItem key={reply._id} comment={reply} isReply={true} level={level + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="divider my-4"></div>
      <div>
        {/* Comment toggle button */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="btn btn-ghost btn-sm mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a9.863 9.863 0 01-4.906-1.289L3 21l1.289-5.094A9.863 9.863 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
          </svg>
          <span>{comments.length} คอมเมนต์</span>
          <svg 
            className={`w-4 h-4 transition-transform ${showComments ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showComments && (
          <div>
            {/* Comment form */}
            {session ? (
              <form onSubmit={(e) => handleSubmitComment(e, false)} className="mb-6">
                <div className="flex gap-3">
                  <div className="avatar">
                    <div className="w-8 h-8 rounded-full">
                      {session.user.image ? (
                        <img src={session.user.image} alt={session.user.name} />
                      ) : (
                        <div className="bg-neutral text-neutral-content rounded-full w-8 h-8 flex items-center justify-center">
                          <span className="text-xs">{session.user.name?.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <textarea
                      key="new-comment"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="textarea textarea-bordered w-full resize-none"
                      rows="3"
                      placeholder="เขียนคอมเมนต์..."
                      maxLength="500"
                      disabled={loading}
                      dir="ltr"
                      style={{ direction: 'ltr', textAlign: 'left' }}
                      onFocus={(e) => {
                        // Set cursor to end of text
                        const len = e.target.value.length;
                        e.target.setSelectionRange(len, len);
                      }}
                    />
                    
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex gap-2 items-center">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleImageUpload(e.target.files, false)}
                          className="file-input file-input-bordered file-input-sm"
                        />
                        <span className="text-sm text-base-content/60">
                          {newComment.length}/500
                        </span>
                      </div>
                      
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={loading || (!newComment.trim() && uploadedImages.length === 0)}
                      >
                        {loading ? (
                          <>
                            <span className="loading loading-spinner loading-xs"></span>
                            กำลังส่ง...
                          </>
                        ) : (
                          'ส่ง'
                        )}
                      </button>
                    </div>
                    
                    {uploadedImages.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {uploadedImages.map((image, index) => (
                          <div key={`upload-image-${index}`} className="relative">
                            <img src={image} alt="Upload preview" className="w-16 h-16 object-cover rounded" />
                            <button
                              type="button"
                              onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== index))}
                              className="absolute -top-1 -right-1 btn btn-circle btn-xs btn-error"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </form>
            ) : (
              <div className="alert alert-info mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>เข้าสู่ระบบเพื่อเขียนคอมเมนต์</span>
                <div>
                  <Link href="/auth/signin" className="btn btn-sm btn-primary">
                    เข้าสู่ระบบ
                  </Link>
                </div>
              </div>
            )}

            {/* Comments list */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-base-200 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a9.863 9.863 0 01-4.906-1.289L3 21l1.289-5.094A9.863 9.863 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                      </svg>
                    </div>
                    <div className="text-base-content/60">
                      <p className="text-lg font-medium">ยังไม่มีคอมเมนต์</p>
                      <p className="text-sm mt-1">เป็นคนแรกที่แสดงความคิดเห็น!</p>
                    </div>
                  </div>
                </div>
              ) : (
                comments.map((comment) => (
                  <CommentItem key={comment._id} comment={comment} />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        imageUrl={selectedImage}
        alt="Comment image"
      />

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-100 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">ยืนยันการลบ comment</h3>
            <p className="text-base-content/70 mb-4">
              คุณต้องการลบ comment นี้หรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้
            </p>

            {['admin', 'dev'].includes(session?.user?.role) && (
              <div className="mb-4">
                <label className="label">
                  <span className="label-text">เหตุผลในการลบ (จะแจ้งไปยังเจ้าของ comment)</span>
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="textarea textarea-bordered w-full"
                  rows="3"
                  placeholder="comment ไม่เหมาะสม"
                />
                <div className="text-xs text-base-content/60 mt-1">
                  หากปล่อยว่างไว้ จะใช้เหตุผลเริ่มต้น: "comment ไม่เหมาะสม"
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowDeleteDialog(null);
                  setDeleteReason('');
                }}
                className="btn btn-ghost"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => performDelete(showDeleteDialog, deleteReason)}
                className="btn btn-error"
              >
                ลบ comment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
