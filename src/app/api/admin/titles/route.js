import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/mongodb';
import User from '../../../../../models/User';
import { checkBanStatus } from '../../../../../lib/checkBanStatus';
import { emitToFeed, emitToAll } from '../../../../../lib/socket';

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

    const { userId, title } = await request.json();

    if (!userId || !title || !title.text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate title
    if (title.text.length > 30) {
      return NextResponse.json({ error: 'Title text too long (max 30 characters)' }, { status: 400 });
    }

    const allowedColors = ['primary', 'secondary', 'accent', 'neutral', 'info', 'success', 'warning', 'error'];
    if (title.color && !allowedColors.includes(title.color)) {
      return NextResponse.json({ error: 'Invalid title color' }, { status: 400 });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Add title
    const newTitle = {
      text: title.text.trim(),
      color: title.color || 'accent',
      icon: title.icon || '👑',
      createdBy: user._id,
      createdAt: new Date()
    };

    targetUser.publicTitles.push(newTitle);
    await targetUser.save();

    // Emit real-time update
    try {
      console.log('Emitting user-updated event for user:', targetUser._id.toString());
      console.log('New publicTitles:', targetUser.publicTitles);

      emitToAll('user-updated', {
        userId: targetUser._id.toString(),
        publicTitles: targetUser.publicTitles,
        customBadges: targetUser.customBadges,
        role: targetUser.role
      });

      console.log('user-updated event emitted successfully');
    } catch (error) {
      console.error('Socket emit error:', error);
    }

    return NextResponse.json({ 
      message: 'Title added successfully',
      title: newTitle,
      user: {
        _id: targetUser._id,
        username: targetUser.username,
        displayName: targetUser.displayName,
        customBadges: targetUser.customBadges,
        publicTitles: targetUser.publicTitles
      }
    });
  } catch (error) {
    console.error('Error adding title:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const { userId, titles } = await request.json();

    if (!userId || !Array.isArray(titles)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update all titles
    targetUser.publicTitles = titles.map(title => ({
      text: title.text.trim(),
      color: title.color || 'accent',
      icon: title.icon || '👑',
      createdBy: user._id,
      createdAt: title.createdAt || new Date()
    }));

    await targetUser.save();

    // Emit real-time update
    try {
      console.log('Emitting user-updated event for user (PUT):', targetUser._id.toString());
      console.log('New publicTitles (PUT):', targetUser.publicTitles);

      emitToAll('user-updated', {
        userId: targetUser._id.toString(),
        publicTitles: targetUser.publicTitles,
        customBadges: targetUser.customBadges,
        role: targetUser.role
      });

      console.log('user-updated event emitted successfully (PUT)');
    } catch (error) {
      console.error('Socket emit error:', error);
    }

    return NextResponse.json({ 
      message: 'Titles updated successfully',
      user: {
        _id: targetUser._id,
        username: targetUser.username,
        displayName: targetUser.displayName,
        customBadges: targetUser.customBadges,
        publicTitles: targetUser.publicTitles
      }
    });
  } catch (error) {
    console.error('Error updating titles:', error);
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
    const titleIndex = searchParams.get('titleIndex');

    if (!userId || titleIndex === null) {
      return NextResponse.json({ error: 'Missing userId or titleIndex' }, { status: 400 });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const index = parseInt(titleIndex);
    if (index < 0 || index >= targetUser.publicTitles.length) {
      return NextResponse.json({ error: 'Invalid title index' }, { status: 400 });
    }

    // Remove title
    targetUser.publicTitles.splice(index, 1);
    await targetUser.save();

    // Emit real-time update
    try {
      console.log('Emitting user-updated event for user (DELETE):', targetUser._id.toString());
      console.log('New publicTitles (DELETE):', targetUser.publicTitles);

      emitToAll('user-updated', {
        userId: targetUser._id.toString(),
        publicTitles: targetUser.publicTitles,
        customBadges: targetUser.customBadges,
        role: targetUser.role
      });

      console.log('user-updated event emitted successfully (DELETE)');
    } catch (error) {
      console.error('Socket emit error:', error);
    }

    return NextResponse.json({ 
      message: 'Title removed successfully',
      user: {
        _id: targetUser._id,
        username: targetUser.username,
        displayName: targetUser.displayName,
        customBadges: targetUser.customBadges,
        publicTitles: targetUser.publicTitles
      }
    });
  } catch (error) {
    console.error('Error removing title:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
