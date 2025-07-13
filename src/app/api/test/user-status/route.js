import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/mongodb';
import User from '../../../../../models/User';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get current user's status
    const currentUser = await User.findOne({ discordId: session.user.discordId })
      .select('username displayName isOnline lastSeen');

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: currentUser,
      message: 'User status retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting user status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { isOnline } = await request.json();

    // Update current user's status
    const updatedUser = await User.findOneAndUpdate(
      { discordId: session.user.discordId },
      {
        isOnline: isOnline,
        lastSeen: new Date()
      },
      { new: true }
    ).select('username displayName isOnline lastSeen');

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: updatedUser,
      message: `User status updated to ${isOnline ? 'online' : 'offline'}`
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
