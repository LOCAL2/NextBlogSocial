import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import connectDB from '../../../../../../lib/mongodb';
import Comment from '../../../../../../models/Comment';
import User from '../../../../../../models/User';
import Notification from '../../../../../../models/Notification';
import { checkBanStatus } from '../../../../../../lib/checkBanStatus';
// import { emitToFeed } from '../../../../../../lib/socket';

export async function POST(request, { params }) {
  try {
    const { banned, session, user } = await checkBanStatus(request);
    if (banned) {
      return NextResponse.json({ error: 'Account has been banned' }, { status: 403 });
    }
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const comment = await Comment.findById(id).populate('author', 'username displayName avatar');
    if (!comment || comment.isDeleted) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user already liked the comment
    const existingLike = comment.likes.find(like => like.user.toString() === user._id.toString());

    if (existingLike) {
      // Unlike the comment
      comment.likes = comment.likes.filter(like => like.user.toString() !== user._id.toString());
    } else {
      // Like the comment
      comment.likes.push({
        user: user._id,
        createdAt: new Date()
      });

      // Create notification for comment author (if not self-like)
      if (comment.author._id.toString() !== user._id.toString()) {
        await Notification.create({
          recipient: comment.author._id,
          sender: user._id,
          type: 'like_comment',
          message: `${user.displayName} ถูกใจคอมเมนต์ของคุณ`,
          relatedComment: comment._id,
          relatedPost: comment.post
        });

        // Emit real-time notification
        try {
          if (global.io) {
            global.io.to('global-feed').emit('notification', {
              userId: comment.author._id.toString(),
              type: 'like_comment',
              message: `${user.displayName} ถูกใจคอมเมนต์ของคุณ`,
              sender: {
                _id: user._id,
                displayName: user.displayName,
                avatar: user.avatar
              }
            });
          }
        } catch (error) {
          console.error('Socket emit error:', error);
        }
      }
    }

    await comment.save();

    // Emit real-time comment like update
    try {
      console.log('Attempting to emit comment-liked event...');
      console.log('global.io available:', !!global.io);

      if (global.io) {
        const eventData = {
          commentId: comment._id.toString(),
          likesCount: comment.likes.length,
          isLiked: !existingLike,
          likes: comment.likes // Send full likes array for UI updates
        };

        // Get connected clients count
        const connectedClients = global.io.sockets.adapter.rooms.get('global-feed');
        console.log('Connected clients in global-feed:', connectedClients ? connectedClients.size : 0);

        // Try both global-feed room and broadcast to all
        global.io.to('global-feed').emit('comment-liked', eventData);
        global.io.emit('comment-liked', eventData); // Broadcast to all connected clients
        console.log('✅ Successfully emitted comment-liked event to global-feed and all clients:', eventData);
      } else {
        console.error('❌ Socket.io instance not available');
      }
    } catch (error) {
      console.error('❌ Socket emit error:', error);
    }

    return NextResponse.json({
      success: true,
      likesCount: comment.likes.length,
      isLiked: !existingLike,
      likes: comment.likes
    });
  } catch (error) {
    console.error('Error toggling comment like:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
