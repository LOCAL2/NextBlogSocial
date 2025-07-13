import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/mongodb';
import User from '../../../../../models/User';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const currentUser = await User.findOne({ discordId: session.user.discordId });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: currentUser._id,
        role: currentUser.role,
        username: currentUser.username,
        discordId: currentUser.discordId,
        isActive: currentUser.isActive,
        customBadges: currentUser.customBadges || [],
        publicTitles: currentUser.publicTitles || []
      }
    });
  } catch (error) {
    console.error('Error refreshing session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
