import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/mongodb';
import FriendRequest from '../../../../../models/FriendRequest';
import User from '../../../../../models/User';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'sent' or 'received'

    await connectDB();

    // Get current user
    const currentUser = await User.findOne({ discordId: session.user.discordId });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let query = {};
    if (type === 'sent') {
      query.sender = currentUser._id;
    } else if (type === 'received') {
      query.receiver = currentUser._id;
    } else {
      // Get both sent and received
      query = {
        $or: [
          { sender: currentUser._id },
          { receiver: currentUser._id }
        ]
      };
    }

    const requests = await FriendRequest.find(query)
      .populate('sender', 'username displayName avatar')
      .populate('receiver', 'username displayName avatar')
      .sort({ createdAt: -1 });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
