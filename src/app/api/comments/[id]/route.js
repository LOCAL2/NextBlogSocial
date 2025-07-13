import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/mongodb';
import Comment from '../../../../../models/Comment';
import AdminAction from '../../../../../models/AdminAction';
import User from '../../../../../models/User';

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { content } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (content.length > 500) {
      return NextResponse.json({ error: 'Comment too long' }, { status: 400 });
    }

    await connectDB();

    const comment = await Comment.findById(id);
    if (!comment || comment.isDeleted) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Get current user
    const currentUser = await User.findOne({ discordId: session.user.discordId });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user can edit (author or admin)
    const canEdit = comment.author.toString() === currentUser._id.toString() || session.user.role === 'admin';
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Save edit history
    const oldContent = comment.content;
    comment.editHistory.push({
      content: oldContent,
      editedAt: new Date()
    });

    comment.content = content.trim();
    comment.isEdited = true;
    await comment.save();

    // Log admin action if admin edited
    if (session.user.role === 'admin' && comment.author.toString() !== currentUser._id.toString()) {
      await AdminAction.create({
        admin: currentUser._id,
        action: 'edit_comment',
        targetUser: comment.author,
        details: {
          oldValue: oldContent,
          newValue: content.trim(),
          reason: 'Admin edit'
        },
        metadata: {
          commentId: comment._id,
          postId: comment.post
        }
      });
    }

    const updatedComment = await Comment.findById(id)
      .populate('author', 'username displayName avatar');

    // Emit real-time comment update
    try {
      const { emitToFeed } = await import('../../../../../lib/socket');
      emitToFeed('comment-updated', {
        postId: comment.post,
        comment: updatedComment
      });
    } catch (error) {
      console.error('Socket emit error:', error);
    }

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { reason } = await request.json().catch(() => ({})); // Get reason from request body

    await connectDB();

    const comment = await Comment.findById(id).populate('author', 'username displayName avatar discordId');
    if (!comment || comment.isDeleted) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Get current user
    const currentUser = await User.findOne({ discordId: session.user.discordId });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user can delete (author or admin/dev)
    const canDelete = comment.author._id.toString() === currentUser._id.toString() ||
                     ['admin', 'dev'].includes(session.user.role);
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete
    comment.isDeleted = true;
    comment.deletedBy = currentUser._id;
    comment.deletedAt = new Date();
    await comment.save();

    // Handle admin/dev deletion of other user's comment
    const isAdminDeletion = ['admin', 'dev'].includes(session.user.role) &&
                           comment.author._id.toString() !== currentUser._id.toString();

    if (isAdminDeletion) {
      const deleteReason = reason?.trim() || 'comment ไม่เหมาะสม';

      // Log admin action
      await AdminAction.create({
        admin: currentUser._id,
        action: 'delete_comment',
        targetUser: comment.author._id,
        details: {
          reason: deleteReason,
          commentContent: comment.content
        },
        metadata: {
          commentId: comment._id,
          postId: comment.post
        }
      });

      // Create notification for comment owner
      const Notification = (await import('../../../../../models/Notification')).default;
      await Notification.create({
        recipient: comment.author._id,
        sender: currentUser._id,
        type: 'comment_deleted_by_admin',
        message: `comment ของคุณถูกลบโดยผู้พัฒนา สาเหตุ: ${deleteReason}`,
        relatedComment: comment._id,
        relatedPost: comment.post
      });

      // Emit real-time notification
      try {
        const { emitToUser } = await import('../../../../../lib/socket');
        emitToUser(comment.author._id.toString(), 'notification', {
          userId: comment.author._id.toString(),
          type: 'comment_deleted_by_admin',
          message: `comment ของคุณถูกลบโดยผู้พัฒนา สาเหตุ: ${deleteReason}`,
          sender: {
            _id: currentUser._id,
            displayName: currentUser.displayName,
            avatar: currentUser.avatar
          }
        });
      } catch (error) {
        console.error('Socket emit error:', error);
      }
    }

    // Emit real-time comment deletion update
    try {
      const { emitToFeed } = await import('../../../../../lib/socket');
      emitToFeed('comment-deleted', {
        postId: comment.post,
        commentId: comment._id
      });
    } catch (error) {
      console.error('Socket emit error:', error);
    }

    return NextResponse.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
