'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import RoleBadge from './RoleBadge';
import { useToast } from './Toast';

export default function CommentSection({ postId, initialComments = [] }) {
  const { data: session } = useSession();
  const toast = useToast();
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [showDropdown, setShowDropdown] = useState(null);

  // Close dropdown when clicking outside
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

  const handleSubmitComment = async (e) => {
    e.preventDefault();

    if (!session) return;
    if (!newComment.trim() && uploadedImages.length === 0) return;

    // Create optimistic comment for immediate UI feedback
    const optimisticComment = {
      _id: `temp-${Date.now()}`, // Temporary ID
      content: newComment.trim(),
      author: {
        _id: session.user.id,
        username: session.user.username,
        displayName: session.user.displayName,
        avatar: session.user.avatar,
        role: session.user.role
      },
      likes: [],
      createdAt: new Date().toISOString(),
      isOptimistic: true // Flag to identify optimistic updates
    };

    // Optimistic update - show comment immediately
    setComments(prev => [optimisticComment, ...prev]);
    const originalComment = newComment.trim();
    setNewComment(''); // Clear form immediately for better UX

    setLoading(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          content: originalComment || '',
          images: uploadedImages || []
        }),
      });

      if (response.ok) {
        const realComment = await response.json();
        // Replace optimistic comment with real comment
        setComments(prev => prev.map(comment =>
          comment._id === optimisticComment._id ? realComment : comment
        ));
      } else {
        // Remove optimistic comment on error
        setComments(prev => prev.filter(comment => comment._id !== optimisticComment._id));
        // Restore form content on error
        setNewComment(originalComment);
        const error = await response.json();
        toast.error(error.error || 'เกิดข้อผิดพลาดในการส่งคอมเมนต์');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      // Remove optimistic comment on error
      setComments(prev => prev.filter(comment => comment._id !== optimisticComment._id));
      // Restore form content on error
      setNewComment(originalComment);
      toast.error('เกิดข้อผิดพลาดในการส่งคอมเมนต์');
    } finally {
      setLoading(false);
    }
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
        setComments(prev => prev.map(comment =>
          comment._id === commentId ? { ...comment, ...updatedComment } : comment
        ));
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
    const comment = comments.find(c => c._id === commentId);
    const isAdminDeletion = ['admin', 'dev'].includes(session?.user?.role) &&
                           comment?.author._id !== session.user.id;

    if (isAdminDeletion) {
      setShowDeleteDialog(commentId);
      return;
    }

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
        setComments(prev => prev.filter(comment => comment._id !== commentId));
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'เมื่อสักครู่';
    if (diffInMinutes < 60) return `${diffInMinutes} นาทีที่แล้ว`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ชั่วโมงที่แล้ว`;
    
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

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
        <div className="space-y-4">
          {/* Comment form */}
          {session ? (
            <form onSubmit={handleSubmitComment} className="mb-4">
              <div className="flex space-x-3">
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
                    rows="2"
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
                    <span className="text-sm text-base-content/60">
                      {newComment.length}/500
                    </span>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={loading || !newComment.trim()}
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
                </div>
              </div>
            </form>
          ) : (
            <div className="alert alert-info mb-4">
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
          <div className="space-y-3">
            {comments.length === 0 ? (
              <p className="text-base-content/60 text-center py-4">ยังไม่มีคอมเมนต์</p>
            ) : (
              comments.map((comment) => (
                <div key={comment._id} className={`flex space-x-3 ${comment.isOptimistic ? 'opacity-70' : ''}`}>
                  <div className="avatar">
                    <div className="w-8 rounded-full">
                      {comment.author.avatar ? (
                        <img src={comment.author.avatar} alt={comment.author.displayName} />
                      ) : (
                        <div className="bg-neutral text-neutral-content rounded-full w-8 h-8 flex items-center justify-center">
                          <span className="text-xs">{comment.author.displayName?.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 relative">
                    <div className="chat chat-start">
                      <div className="chat-header">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/profile/${comment.author.username}`}
                            className="font-semibold text-sm hover:text-primary link link-hover"
                          >
                            {comment.author.displayName}
                          </Link>
                          <RoleBadge role={comment.author.role} size="xs" />
                          {comment.isOptimistic && (
                            <span className="text-xs opacity-50 flex items-center gap-1">
                              <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              กำลังส่ง...
                            </span>
                          )}
                        </div>
                        <time className="text-xs opacity-50 ml-2">
                          {formatDate(comment.createdAt)}
                        </time>
                        {comment.isEdited && (
                          <span className="text-xs opacity-50 ml-1">(แก้ไขแล้ว)</span>
                        )}
                      </div>

                      {/* Dropdown Menu */}
                      {(canEditComment(comment) || canDeleteComment(comment)) && (
                        <div className="absolute top-0 right-0 z-10">
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
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-base-200 rounded flex items-center gap-2"
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
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-error hover:text-error-content rounded flex items-center gap-2 text-error"
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
                            dir="ltr"
                            style={{ direction: 'ltr', textAlign: 'left' }}
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
                        <div className={`chat-bubble chat-bubble-primary ${comment.isOptimistic ? 'border border-dashed border-primary/50' : ''}`}>
                          <p className="text-sm whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      </div>

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
