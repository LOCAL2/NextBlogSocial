import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import Comment from '../../../../models/Comment';
import Post from '../../../../models/Post';
import User from '../../../../models/User';
import Notification from '../../../../models/Notification';
import FriendRequest from '../../../../models/FriendRequest';
import { checkBanStatus } from '../../../../lib/checkBanStatus';
import { emitToFeed } from '../../../../lib/socket';

export async function POST(request) {
  try {
    // Check ban status
    const { banned, session, user } = await checkBanStatus(request);
    if (banned) {
      return NextResponse.json({ error: 'Account has been banned' }, { status: 403 });
    }
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId, content, parentCommentId, images = [] } = await request.json();

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Allow comment with either content or images (or both)
    if ((!content || content.trim().length === 0) && (!images || images.length === 0)) {
      return NextResponse.json({ error: 'Comment must have either text content or images' }, { status: 400 });
    }

    if (content && content.length > 500) {
      return NextResponse.json({ error: 'Comment too long' }, { status: 400 });
    }

    await connectDB();

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post || post.isDeleted) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // If replying to a comment, check if parent comment exists
    if (parentCommentId) {
      console.log('🔍 Checking parent comment:', parentCommentId);

      // Validate ObjectId format
      if (!parentCommentId.match(/^[0-9a-fA-F]{24}$/)) {
        console.log('❌ Invalid parent comment ID format:', parentCommentId);
        return NextResponse.json({ error: 'Invalid parent comment ID format' }, { status: 400 });
      }

      const parentComment = await Comment.findById(parentCommentId);
      console.log('📝 Parent comment found:', !!parentComment);
      console.log('🗑️ Parent comment deleted:', parentComment?.isDeleted);

      if (!parentComment) {
        console.log('❌ Parent comment not found');
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
      }

      if (parentComment.isDeleted) {
        console.log('❌ Parent comment has been deleted');
        return NextResponse.json({ error: 'Cannot reply to a deleted comment' }, { status: 400 });
      }

      // Check if parent comment belongs to the same post
      if (parentComment.post.toString() !== postId) {
        console.log('❌ Parent comment belongs to different post');
        return NextResponse.json({ error: 'Parent comment belongs to different post' }, { status: 400 });
      }

      console.log('✅ Parent comment validation passed');
    }

    // Use user from checkBanStatus
    const currentUser = user;

    // Create comment
    const comment = await Comment.create({
      post: postId,
      author: currentUser._id,
      content: content.trim(),
      images: images || [],
      parentComment: parentCommentId || null
    });

    // Add comment to post
    await Post.findByIdAndUpdate(postId, {
      $push: { comments: comment._id }
    });

    // If replying to a comment, add to parent's replies and create notification
    if (parentCommentId) {
      const parentComment = await Comment.findByIdAndUpdate(parentCommentId, {
        $push: { replies: comment._id }
      }).populate('author', 'username displayName avatar');

      // Create notification for parent comment author (if not self-reply)
      if (parentComment && parentComment.author._id.toString() !== currentUser._id.toString()) {
        await Notification.create({
          recipient: parentComment.author._id,
          sender: currentUser._id,
          type: 'reply',
          message: `${currentUser.displayName} ตอบกลับคอมเมนต์ของคุณ`,
          relatedComment: comment._id,
          relatedPost: postId
        });

        // Emit real-time notification
        try {
          emitToFeed('notification', {
            userId: parentComment.author._id.toString(),
            type: 'reply',
            message: `${currentUser.displayName} ตอบกลับคอมเมนต์ของคุณ`,
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
    } else {
      // This is a new comment on post, notify post author
      const post = await Post.findById(postId).populate('author', 'username displayName avatar');
      if (post && post.author._id.toString() !== currentUser._id.toString()) {
        await Notification.create({
          recipient: post.author._id,
          sender: currentUser._id,
          type: 'comment',
          message: `${currentUser.displayName} แสดงความคิดเห็นในโพสต์ของคุณ`,
          relatedComment: comment._id,
          relatedPost: postId
        });

        // Emit real-time notification
        try {
          emitToFeed('notification', {
            userId: post.author._id.toString(),
            type: 'comment',
            message: `${currentUser.displayName} แสดงความคิดเห็นในโพสต์ของคุณ`,
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
    }

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username displayName avatar role customBadges publicTitles');

    // Emit real-time comment update
    try {
      emitToFeed('comment-added', {
        postId: postId,
        comment: populatedComment
      });
    } catch (error) {
      console.error('Socket emit error:', error);
    }

    return NextResponse.json(populatedComment, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
