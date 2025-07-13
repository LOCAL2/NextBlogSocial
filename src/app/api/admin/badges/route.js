import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/mongodb';
import User from '../../../../../models/User';
import { checkBanStatus } from '../../../../../lib/checkBanStatus';

export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      // Get specific user's badges
      const targetUser = await User.findById(userId).select('username displayName customBadges role publicTitles');
      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json(targetUser);
    } else {
      // Get all users with their badges
      const users = await User.find({})
        .select('username displayName customBadges role publicTitles avatar isOnline lastSeen')
        .sort({ displayName: 1 });
      return NextResponse.json(users);
    }
  } catch (error) {
    console.error('Error fetching badges:', error);
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

    // Check if user is admin or dev
    if (!['admin', 'dev'].includes(user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await connectDB();

    const { userId, badge } = await request.json();

    if (!userId || !badge || !badge.text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate badge
    if (badge.text.length > 20) {
      return NextResponse.json({ error: 'Badge text too long (max 20 characters)' }, { status: 400 });
    }

    const allowedColors = ['primary', 'secondary', 'accent', 'neutral', 'info', 'success', 'warning', 'error'];
    if (badge.color && !allowedColors.includes(badge.color)) {
      return NextResponse.json({ error: 'Invalid badge color' }, { status: 400 });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Add badge
    const newBadge = {
      text: badge.text.trim(),
      color: badge.color || 'primary',
      icon: badge.icon || '',
      createdBy: user._id,
      createdAt: new Date()
    };

    targetUser.customBadges.push(newBadge);
    await targetUser.save();

    return NextResponse.json({
      message: 'Badge added successfully',
      badge: newBadge,
      user: {
        _id: targetUser._id,
        username: targetUser.username,
        displayName: targetUser.displayName,
        customBadges: targetUser.customBadges,
        publicTitles: targetUser.publicTitles
      }
    });
  } catch (error) {
    console.error('Error adding badge:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const badgeIndex = searchParams.get('badgeIndex');

    if (!userId || badgeIndex === null) {
      return NextResponse.json({ error: 'Missing userId or badgeIndex' }, { status: 400 });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const index = parseInt(badgeIndex);
    if (index < 0 || index >= targetUser.customBadges.length) {
      return NextResponse.json({ error: 'Invalid badge index' }, { status: 400 });
    }

    // Remove badge
    targetUser.customBadges.splice(index, 1);
    await targetUser.save();

    return NextResponse.json({
      message: 'Badge removed successfully',
      user: {
        _id: targetUser._id,
        username: targetUser.username,
        displayName: targetUser.displayName,
        customBadges: targetUser.customBadges,
        publicTitles: targetUser.publicTitles
      }
    });
  } catch (error) {
    console.error('Error removing badge:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
