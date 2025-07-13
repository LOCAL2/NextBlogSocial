import { NextResponse } from 'next/server';
import connectDB from '../../../../../../lib/mongodb';
import Follow from '../../../../../../models/Follow';
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

    // Check if following
    const isFollowing = await Follow.findOne({
      follower: user._id,
      following: userId
    });

    return NextResponse.json({ 
      isFollowing: !!isFollowing 
    });

  } catch (error) {
    console.error('Error checking follow status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
