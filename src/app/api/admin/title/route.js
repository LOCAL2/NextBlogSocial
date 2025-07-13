import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/mongodb';
import User from '../../../../../models/User';
import { checkBanStatus } from '../../../../../lib/checkBanStatus';

export async function PUT(request) {
  try {
    const { banned, session, user } = await checkBanStatus(request);
    if (banned) {
      return NextResponse.json({ error: 'Account has been banned' }, { status: 403 });
    }
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or dev
    if (!['admin', 'dev'].includes(user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await connectDB();

    const { userId, publicTitle } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Validate title length
    if (publicTitle && publicTitle.length > 30) {
      return NextResponse.json({ error: 'Title too long (max 30 characters)' }, { status: 400 });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update public title
    targetUser.publicTitle = publicTitle ? publicTitle.trim() : null;
    await targetUser.save();

    return NextResponse.json({ 
      message: 'Public title updated successfully',
      user: {
        _id: targetUser._id,
        username: targetUser.username,
        displayName: targetUser.displayName,
        customBadges: targetUser.customBadges,
        publicTitle: targetUser.publicTitle,
        role: targetUser.role
      }
    });
  } catch (error) {
    console.error('Error updating public title:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
