import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/mongodb';
import Post from '../../../../../models/Post';
import AdminAction from '../../../../../models/AdminAction';
import User from '../../../../../models/User';
import { emitToFeed } from '../../../../../lib/socket';

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { content, visibility } = await request.json();

    // Validate content if provided
    if (content !== undefined) {
      if (!content || content.trim().length === 0) {
        return NextResponse.json({ error: 'Content is required' }, { status: 400 });
      }

      if (content.length > 2000) {
        return NextResponse.json({ error: 'Content too long' }, { status: 400 });
      }
    }

    // Validate visibility if provided
    if (visibility !== undefined && !['public', 'followers', 'private'].includes(visibility)) {
      return NextResponse.json({ error: 'Invalid visibility setting' }, { status: 400 });
    }

    await connectDB();

    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Get current user
    const currentUser = await User.findOne({ discordId: session.user.discordId });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user can edit (author or admin)
    const canEdit = post.author.toString() === currentUser._id.toString() || session.user.role === 'admin';
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prepare update object
    const updateData = {};
    let hasChanges = false;

    // Update content if provided
    if (content !== undefined) {
      const oldContent = post.content;
      post.editHistory.push({
        content: oldContent,
        editedAt: new Date(),
        editedBy: currentUser._id
      });

      updateData.content = content.trim();
      updateData.isEdited = true;
      hasChanges = true;

      // Log admin action if admin edited content
      if (session.user.role === 'admin' && post.author.toString() !== currentUser._id.toString()) {
        await AdminAction.create({
          admin: currentUser._id,
          action: 'edit_post',
          targetPost: post._id,
          targetUser: post.author,
          details: {
            oldValue: oldContent,
            newValue: content.trim(),
            reason: 'Admin edit content'
          }
        });
      }
    }

    // Update visibility if provided
    let oldVisibility = null;
    if (visibility !== undefined) {
      oldVisibility = post.visibility;
      updateData.visibility = visibility;
      hasChanges = true;

      // Log admin action if admin changed visibility
      if (session.user.role === 'admin' && post.author.toString() !== currentUser._id.toString()) {
        await AdminAction.create({
          admin: currentUser._id,
          action: 'edit_post',
          targetPost: post._id,
          targetUser: post.author,
          details: {
            oldValue: oldVisibility,
            newValue: visibility,
            reason: 'Admin edit visibility'
          }
        });
      }
    }

    if (!hasChanges) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
    }

    // Apply updates
    Object.assign(post, updateData);
    await post.save();

    // Emit real-time updates via socket
    if (global.io) {
      console.log('🔄 Emitting post-updated event for post:', post._id);

      // Get the full populated post for emitting
      const populatedPost = await Post.findById(post._id)
        .populate('author', 'username displayName profilePicture role badges')
        .populate('likes', 'username displayName profilePicture')
        .lean();

      // Emit to all clients in global feed
      global.io.to('global-feed').emit('post-updated', {
        postId: post._id.toString(),
        updatedPost: populatedPost
      });

      // Handle visibility-specific events
      if (visibility !== undefined && oldVisibility !== null) {
        console.log(`🔄 Visibility changed from "${oldVisibility}" to "${visibility}"`);

        if (visibility === 'public' && oldVisibility !== 'public') {
          // Post became public - emit post-shown event
          console.log('🌍 Emitting post-shown event for public visibility');
          global.io.to('global-feed').emit('post-shown', {
            postId: post._id.toString(),
            newPost: populatedPost,
            visibility: visibility,
            oldVisibility: oldVisibility,
            authorId: post.author.toString()
          });

          // Also broadcast to all clients
          global.io.emit('post-shown', {
            postId: post._id.toString(),
            newPost: populatedPost,
            visibility: visibility,
            oldVisibility: oldVisibility,
            authorId: post.author.toString()
          });
        } else if (visibility !== 'public' && oldVisibility === 'public') {
          // Post became private/followers from public - emit post-hidden event
          console.log('🔒 Emitting post-hidden event for non-public visibility');
          global.io.to('global-feed').emit('post-hidden', {
            postId: post._id.toString(),
            visibility: visibility,
            oldVisibility: oldVisibility,
            authorId: post.author.toString()
          });

          // Also broadcast to all clients
          global.io.emit('post-hidden', {
            postId: post._id.toString(),
            visibility: visibility,
            oldVisibility: oldVisibility,
            authorId: post.author.toString()
          });
        }
      }
    }

    const updatedPost = await Post.findById(id)
      .populate('author', 'username displayName avatar');

    // Emit real-time event for post update
    try {
      emitToFeed('post-updated', updatedPost);
    } catch (error) {
      console.error('Socket emit error:', error);
    }

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error);
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

    await connectDB();

    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Get current user
    const currentUser = await User.findOne({ discordId: session.user.discordId });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user can delete (author or admin)
    const canDelete = post.author.toString() === currentUser._id.toString() || session.user.role === 'admin';
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete
    post.isDeleted = true;
    post.deletedBy = currentUser._id;
    post.deletedAt = new Date();
    await post.save();

    // Log admin action if admin deleted
    if (session.user.role === 'admin' && post.author.toString() !== currentUser._id.toString()) {
      await AdminAction.create({
        admin: currentUser._id,
        action: 'delete_post',
        targetPost: post._id,
        targetUser: post.author,
        details: {
          reason: 'Admin deletion'
        }
      });
    }

    // Emit real-time event for post deletion
    try {
      emitToFeed('post-deleted', { postId: id });
    } catch (error) {
      console.error('Socket emit error:', error);
    }

    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
