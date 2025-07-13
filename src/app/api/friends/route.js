import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import FriendRequest from '../../../../models/FriendRequest';
import Notification from '../../../../models/Notification';
import { checkBanStatus } from '../../../../lib/checkBanStatus';
import mongoose from 'mongoose';

export async function GET(request) {
  try {
    const { banned, session, user } = await checkBanStatus(request);
    if (banned) {
      return NextResponse.json({ error: 'Account has been banned' }, { status: 403 });
    }
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const currentUser = await User.findById(user._id).populate('friends', 'username displayName avatar');

    console.log('GET /api/friends - User ID:', user._id);
    console.log('GET /api/friends - Friends count:', currentUser.friends?.length || 0);

    return NextResponse.json({
      friends: currentUser.friends || []
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { banned, session, user } = await checkBanStatus(request);
    if (banned) {
      return NextResponse.json({ error: 'Account has been banned' }, { status: 403 });
    }
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { receiverId, message } = await request.json();

    if (!receiverId) {
      return NextResponse.json({ error: 'Receiver ID is required' }, { status: 400 });
    }

    await connectDB();

    // Use user from checkBanStatus
    const sender = user;

    if (receiverId === sender._id.toString()) {
      return NextResponse.json({ error: 'Cannot send friend request to yourself' }, { status: 400 });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if already friends
    console.log('POST /api/friends - Sender ID:', sender._id);
    console.log('POST /api/friends - Receiver ID:', receiverId);
    console.log('POST /api/friends - Sender friends:', sender.friends);

    const isAlreadyFriend = sender.friends.some(friendId => friendId.toString() === receiverId);
    console.log('POST /api/friends - Is already friend?', isAlreadyFriend);

    if (isAlreadyFriend) {
      return NextResponse.json({ error: 'Already friends' }, { status: 400 });
    }

    // Check if friend request already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: sender._id, receiver: receiverId },
        { sender: receiverId, receiver: sender._id }
      ]
    });

    if (existingRequest) {
      return NextResponse.json({ error: 'Friend request already exists' }, { status: 400 });
    }

    // Create friend request
    const friendRequest = await FriendRequest.create({
      sender: sender._id,
      receiver: receiverId,
      message: message || ''
    });

    const populatedRequest = await FriendRequest.findById(friendRequest._id)
      .populate('sender', 'username displayName avatar')
      .populate('receiver', 'username displayName avatar');

    // Create notification for receiver
    const notification = await Notification.create({
      recipient: receiverId,
      sender: sender._id,
      type: 'friend_request',
      message: `${sender.displayName} ส่งคำขอเป็นเพื่อนมาให้คุณ`,
      relatedFriendRequest: friendRequest._id,
      isRead: false
    });

    // Emit real-time notification
    try {
      if (global.emitToUser) {
        global.emitToUser(receiverId.toString(), 'new-notification', {
          notification: {
            ...notification.toObject(),
            sender: {
              _id: sender._id,
              displayName: sender.displayName,
              avatar: sender.avatar
            }
          }
        });
      }
    } catch (error) {
      console.error('Socket emit error:', error);
    }

    // Emit friend status update to both users
    try {
      if (global.emitToUser) {
        global.emitToUser(sender._id.toString(), 'friend-status-update', {
          userId: receiverId,
          status: 'pending_sent',
          requestId: friendRequest._id
        });
        global.emitToUser(receiverId.toString(), 'friend-status-update', {
          userId: sender._id.toString(),
          status: 'pending_received',
          requestId: friendRequest._id
        });
      }
    } catch (error) {
      console.error('Socket emit error:', error);
    }

    return NextResponse.json(populatedRequest, { status: 201 });
  } catch (error) {
    console.error('Error sending friend request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  console.log('DELETE /api/friends - Starting...');

  try {
    console.log('DELETE /api/friends - Checking ban status...');
    const { banned, session, user } = await checkBanStatus(request);

    console.log('DELETE /api/friends - Ban check result:', { banned, hasSession: !!session, userId: user?._id });

    if (banned) {
      console.log('DELETE /api/friends - User is banned');
      return NextResponse.json({ error: 'Account has been banned' }, { status: 403 });
    }
    if (!session) {
      console.log('DELETE /api/friends - No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const friendId = searchParams.get('friendId');

    console.log('DELETE /api/friends - Request params:', { friendId });

    if (!friendId) {
      console.log('DELETE /api/friends - No friendId provided');
      return NextResponse.json({ error: 'Friend ID is required' }, { status: 400 });
    }

    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(friendId)) {
      console.log('DELETE /api/friends - Invalid friendId format');
      return NextResponse.json({ error: 'Invalid friend ID format' }, { status: 400 });
    }

    // Prevent self-removal
    if (friendId === user._id.toString()) {
      console.log('DELETE /api/friends - Attempting self-removal');
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }

    console.log('DELETE /api/friends - Connecting to database...');
    await connectDB();

    console.log('DELETE /api/friends - Finding users...');
    const currentUser = await User.findById(user._id).select('username displayName avatar friends');
    const friendUser = await User.findById(friendId).select('username displayName avatar friends');

    if (!friendUser) {
      console.log('DELETE /api/friends - Friend user not found');
      return NextResponse.json({ error: 'Friend not found' }, { status: 404 });
    }

    if (!currentUser) {
      console.log('DELETE /api/friends - Current user not found');
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    // Check if they are actually friends
    const isFriend = currentUser.friends.some(friend => friend.toString() === friendId);
    console.log('DELETE /api/friends - Is friend?', isFriend);
    console.log('DELETE /api/friends - Current user friends:', currentUser.friends.map(f => f.toString()));
    console.log('DELETE /api/friends - Looking for friend ID:', friendId);
    console.log('DELETE /api/friends - Friend ID type:', typeof friendId);
    console.log('DELETE /api/friends - Current user ID type:', typeof currentUser._id);

    if (!isFriend) {
      console.log('DELETE /api/friends - Not friends');
      return NextResponse.json({ error: 'Not friends' }, { status: 400 });
    }

    // Remove each other from friends list
    console.log('DELETE /api/friends - Removing friends from database...');
    console.log('DELETE /api/friends - Before removal - Current user friends:', currentUser.friends);
    console.log('DELETE /api/friends - Before removal - Friend user friends:', friendUser.friends);

    try {
      // Convert to ObjectId to ensure proper comparison
      const friendObjectId = new mongoose.Types.ObjectId(friendId);
      const currentUserObjectId = new mongoose.Types.ObjectId(currentUser._id);

      console.log('DELETE /api/friends - Using ObjectIds:', {
        friendObjectId: friendObjectId.toString(),
        currentUserObjectId: currentUserObjectId.toString()
      });

      const result1 = await User.findByIdAndUpdate(currentUserObjectId, {
        $pull: { friends: friendObjectId }
      }, { new: true });

      const result2 = await User.findByIdAndUpdate(friendObjectId, {
        $pull: { friends: currentUserObjectId }
      }, { new: true });

      console.log('DELETE /api/friends - After removal - Current user friends:', result1?.friends || 'null');
      console.log('DELETE /api/friends - After removal - Friend user friends:', result2?.friends || 'null');
      console.log('DELETE /api/friends - Successfully removed friends from database');
    } catch (dbError) {
      console.error('DELETE /api/friends - Database update error:', dbError);
      throw dbError;
    }

    // Emit friend status update to both users
    try {
      if (global.emitToUser) {
        console.log('DELETE /api/friends - Emitting status updates...');
        global.emitToUser(currentUser._id.toString(), 'friend-status-update', {
          userId: friendId,
          status: 'none'
        });
        global.emitToUser(friendId.toString(), 'friend-status-update', {
          userId: currentUser._id.toString(),
          status: 'none'
        });
        console.log('DELETE /api/friends - Status updates emitted');
      }
    } catch (error) {
      console.error('Socket emit error:', error);
    }

    console.log('DELETE /api/friends - Success!');
    return NextResponse.json({
      message: 'Friend removed successfully',
      removedFriend: {
        _id: friendUser._id,
        displayName: friendUser.displayName
      }
    });

  } catch (error) {
    console.error('Error removing friend:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
