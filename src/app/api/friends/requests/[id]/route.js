import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import connectDB from '../../../../../../lib/mongodb';
import FriendRequest from '../../../../../../models/FriendRequest';
import User from '../../../../../../models/User';
import Notification from '../../../../../../models/Notification';

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { action } = await request.json(); // 'accept' or 'decline'

    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await connectDB();

    const friendRequest = await FriendRequest.findById(id)
      .populate('sender', 'username displayName avatar')
      .populate('receiver', 'username displayName avatar');
    if (!friendRequest) {
      return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
    }

    // Only receiver can accept/decline
    if (friendRequest.receiver._id.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (friendRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Friend request already processed' }, { status: 400 });
    }

    if (action === 'accept') {
      // Add each other as friends
      await User.findByIdAndUpdate(friendRequest.sender._id, {
        $addToSet: { friends: friendRequest.receiver._id }
      });

      await User.findByIdAndUpdate(friendRequest.receiver._id, {
        $addToSet: { friends: friendRequest.sender._id }
      });

      friendRequest.status = 'accepted';

      // Create notification for sender (accepted)
      const notification = await Notification.create({
        recipient: friendRequest.sender._id,
        sender: friendRequest.receiver._id,
        type: 'friend_accepted',
        message: `${friendRequest.receiver.displayName} ยอมรับคำขอเป็นเพื่อนของคุณแล้ว`,
        relatedFriendRequest: friendRequest._id,
        isRead: false
      });

      // Emit real-time notification
      try {
        if (global.emitToUser) {
          global.emitToUser(friendRequest.sender._id.toString(), 'new-notification', {
            notification: {
              ...notification.toObject(),
              sender: {
                _id: friendRequest.receiver._id,
                displayName: friendRequest.receiver.displayName,
                avatar: friendRequest.receiver.avatar
              }
            }
          });
        }
      } catch (error) {
        console.error('Socket emit error:', error);
      }

      // Emit friend status update to both users (accepted)
      try {
        if (global.emitToUser) {
          global.emitToUser(friendRequest.sender._id.toString(), 'friend-status-update', {
            userId: friendRequest.receiver._id.toString(),
            status: 'friends'
          });
          global.emitToUser(friendRequest.receiver._id.toString(), 'friend-status-update', {
            userId: friendRequest.sender._id.toString(),
            status: 'friends'
          });
        }
      } catch (error) {
        console.error('Socket emit error:', error);
      }
    } else {
      friendRequest.status = 'declined';

      // Create notification for sender (declined)
      const notification = await Notification.create({
        recipient: friendRequest.sender._id,
        sender: friendRequest.receiver._id,
        type: 'friend_declined',
        message: `${friendRequest.receiver.displayName} ปฏิเสธคำขอเป็นเพื่อนของคุณ`,
        relatedFriendRequest: friendRequest._id,
        isRead: false
      });

      // Emit real-time notification
      try {
        if (global.emitToUser) {
          global.emitToUser(friendRequest.sender._id.toString(), 'new-notification', {
            notification: {
              ...notification.toObject(),
              sender: {
                _id: friendRequest.receiver._id,
                displayName: friendRequest.receiver.displayName,
                avatar: friendRequest.receiver.avatar
              }
            }
          });
        }
      } catch (error) {
        console.error('Socket emit error:', error);
      }

      // Emit friend status update to both users (declined)
      try {
        if (global.emitToUser) {
          global.emitToUser(friendRequest.sender._id.toString(), 'friend-status-update', {
            userId: friendRequest.receiver._id.toString(),
            status: 'none'
          });
          global.emitToUser(friendRequest.receiver._id.toString(), 'friend-status-update', {
            userId: friendRequest.sender._id.toString(),
            status: 'none'
          });
        }
      } catch (error) {
        console.error('Socket emit error:', error);
      }
    }

    await friendRequest.save();

    const populatedRequest = await FriendRequest.findById(id)
      .populate('sender', 'username displayName avatar')
      .populate('receiver', 'username displayName avatar');

    return NextResponse.json(populatedRequest);
  } catch (error) {
    console.error('Error processing friend request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    await connectDB();

    const friendRequest = await FriendRequest.findById(id);
    if (!friendRequest) {
      return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
    }

    // Only sender can cancel their own request
    if (friendRequest.sender.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await FriendRequest.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Friend request cancelled' });
  } catch (error) {
    console.error('Error cancelling friend request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
