import { NextResponse } from 'next/server';
import connectDB from '../../../../../../lib/mongodb';
import User from '../../../../../../models/User';
import FriendRequest from '../../../../../../models/FriendRequest';
import { checkBanStatus } from '../../../../../../lib/checkBanStatus';

export async function GET(request, { params }) {
  try {
    const { banned, session, user } = await checkBanStatus(request);
    if (banned) {
      return NextResponse.json({ error: 'Account has been banned' }, { status: 403 });
    }
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await connectDB();

    const currentUser = await User.findById(user._id).populate('friends');
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('=== Friend Status Check ===');
    console.log('Current User ID:', user._id);
    console.log('Target User ID:', userId);
    console.log('Current User Friends IDs:', currentUser.friends.map(f => f._id.toString()));
    console.log('Target User in Friends?', currentUser.friends.some(f => f._id.toString() === userId));
    console.log('Friends Array Length:', currentUser.friends.length);

    // Check if they are already friends
    const isFriend = currentUser.friends.some(friend => friend._id.toString() === userId);
    if (isFriend) {
      return NextResponse.json({ status: 'friends' });
    }

    // Check for existing friend requests
    const sentRequest = await FriendRequest.findOne({
      sender: currentUser._id,
      receiver: userId,
      status: 'pending'
    });

    if (sentRequest) {
      return NextResponse.json({ 
        status: 'pending_sent',
        requestId: sentRequest._id
      });
    }

    const receivedRequest = await FriendRequest.findOne({
      sender: userId,
      receiver: currentUser._id,
      status: 'pending'
    });

    if (receivedRequest) {
      return NextResponse.json({ 
        status: 'pending_received',
        requestId: receivedRequest._id
      });
    }

    // No relationship
    return NextResponse.json({ status: 'none' });

  } catch (error) {
    console.error('Error checking friend status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
