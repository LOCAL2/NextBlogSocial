import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Follow from '../../../../models/Follow';
import User from '../../../../models/User';
import Notification from '../../../../models/Notification';
import { checkBanStatus } from '../../../../lib/checkBanStatus';
import { emitToUser, emitToFeed } from '../../../../lib/socket';

// GET - Get following/followers lists
export async function GET(request) {
  try {
    const { banned, session, user } = await checkBanStatus(request);
    if (banned) {
      return NextResponse.json({ error: 'Account has been banned' }, { status: 403 });
    }
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'following' or 'followers'

    await connectDB();

    if (type === 'following') {
      // Get users that current user is following
      const following = await Follow.find({ follower: user._id })
        .populate('following', 'displayName avatar role publicTitles')
        .sort({ createdAt: -1 });

      return NextResponse.json({
        following: following.map(f => f.following)
      });
    } else if (type === 'followers') {
      // Get users that are following current user
      const followers = await Follow.find({ following: user._id })
        .populate('follower', 'displayName avatar role publicTitles')
        .sort({ createdAt: -1 });

      return NextResponse.json({
        followers: followers.map(f => f.follower)
      });
    } else {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching follow data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Follow user
export async function POST(request) {
  try {
    const { banned, session, user } = await checkBanStatus(request);
    if (banned) {
      return NextResponse.json({ error: 'Account has been banned' }, { status: 403 });
    }
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (userId === user._id.toString()) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    await connectDB();

    // Check if already following
    const existingFollow = await Follow.findOne({
      follower: user._id,
      following: userId
    });

    if (existingFollow) {
      return NextResponse.json({ error: 'Already following' }, { status: 400 });
    }

    // Create follow relationship
    console.log(`📝 Creating follow record: ${user._id} -> ${userId}`);
    const follow = await Follow.create({
      follower: user._id,
      following: userId
    });
    console.log(`✅ Follow record created:`, follow);

    // Verify the follow was created
    const verifyFollow = await Follow.findOne({ follower: user._id, following: userId });
    console.log(`🔍 Verification - Follow exists:`, !!verifyFollow);

    // Get user info for notification
    const follower = await User.findById(user._id).select('displayName avatar');
    
    // Create notification
    await Notification.create({
      recipient: userId,
      sender: user._id,
      type: 'new_follower',
      message: `${follower.displayName} เริ่มติดตามคุณแล้ว`,
      isRead: false
    });

    // Emit real-time follow event
    try {
      console.log(`🔔 Emitting follow event: ${user._id} followed ${userId}`);

      // Check if global.io is available
      if (global.io) {
        console.log('✅ global.io is available for follow events');

        // Emit to the follower (current user) to update their feed
        console.log(`📤 Emitting user-followed to user: ${user._id}`);
        emitToUser(user._id.toString(), 'user-followed', {
          followedUserId: userId,
          followedUser: await User.findById(userId).select('username displayName avatar'),
          timestamp: new Date()
        });

        // Emit to global feed to update posts visibility
        console.log(`📤 Emitting follow-updated to global feed`);
        emitToFeed('follow-updated', {
          followerId: user._id.toString(),
          followedUserId: userId,
          action: 'follow',
          timestamp: new Date()
        });

        // Emit notification to the followed user
        console.log(`📤 Emitting notification to user: ${userId}`);
        emitToUser(userId, 'notification', {
          type: 'new_follower',
          message: `${follower.displayName} เริ่มติดตามคุณแล้ว`,
          sender: {
            _id: user._id,
            displayName: follower.displayName,
            avatar: follower.avatar
          },
          timestamp: new Date()
        });

        console.log('✅ All follow events emitted successfully');
      } else {
        console.error('❌ global.io is not available for follow events');
      }
    } catch (error) {
      console.error('Error emitting follow events:', error);
    }

    return NextResponse.json({ message: 'Following successfully', follow });
  } catch (error) {
    console.error('Error following user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Unfollow user
export async function DELETE(request) {
  try {
    const { banned, session, user } = await checkBanStatus(request);
    if (banned) {
      return NextResponse.json({ error: 'Account has been banned' }, { status: 403 });
    }
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await connectDB();

    // Remove follow relationship
    const result = await Follow.findOneAndDelete({
      follower: user._id,
      following: userId
    });

    if (!result) {
      return NextResponse.json({ error: 'Not following this user' }, { status: 400 });
    }

    // Emit real-time unfollow event
    try {
      console.log(`🔔 Emitting unfollow event: ${user._id} unfollowed ${userId}`);

      // Emit to the unfollower (current user) to update their feed
      emitToUser(user._id.toString(), 'user-unfollowed', {
        unfollowedUserId: userId,
        unfollowedUser: await User.findById(userId).select('username displayName avatar'),
        timestamp: new Date()
      });

      // Emit to global feed to update posts visibility
      emitToFeed('follow-updated', {
        followerId: user._id.toString(),
        followedUserId: userId,
        action: 'unfollow',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error emitting unfollow events:', error);
    }

    return NextResponse.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
