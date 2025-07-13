import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import Notification from '../../../../models/Notification';
import User from '../../../../models/User';
import { checkBanStatus } from '../../../../lib/checkBanStatus';

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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ recipient: user._id })
      .populate('sender', 'username displayName avatar role')
      .populate('relatedPost', 'content')
      .populate('relatedComment', 'content')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const unreadCount = await Notification.countDocuments({ 
      recipient: user._id, 
      isRead: false 
    });

    return NextResponse.json({
      notifications,
      unreadCount,
      hasMore: notifications.length === limit
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
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

    await connectDB();

    const { notificationIds, markAllAsRead } = await request.json();

    if (markAllAsRead) {
      // Mark all notifications as read
      await Notification.updateMany(
        { recipient: user._id, isRead: false },
        { isRead: true, readAt: new Date() }
      );
    } else if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      await Notification.updateMany(
        { _id: { $in: notificationIds }, recipient: user._id },
        { isRead: true, readAt: new Date() }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Delete all notifications for the user
    await Notification.deleteMany({ recipient: session.user.id });

    return NextResponse.json({ message: 'All notifications deleted successfully' });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
