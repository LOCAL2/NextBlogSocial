import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import Post from '../../../../models/Post';
import User from '../../../../models/User';
import Notification from '../../../../models/Notification';
import FriendRequest from '../../../../models/FriendRequest';
import { emitToFeed } from '../../../../lib/socket';
import { checkBanStatus } from '../../../../lib/checkBanStatus';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    await connectDB();

    let query = { isDeleted: false };

    // If userId is provided, filter posts by that user
    if (userId) {
      query.author = userId;
    }

    // Fetch posts
    const posts = await Post.find(query)
      .populate('author', 'username displayName avatar role customBadges publicTitles')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username displayName avatar role customBadges publicTitles'
        }
      })
      .sort({ createdAt: -1 })
      .limit(50);

    // If no userId filter, sort posts with friend priority
    if (!userId) {
      // Get current user to check friends
      const currentUser = await User.findOne({ discordId: session.user.discordId }).populate('friends');
      if (!currentUser) {
        return NextResponse.json(posts);
      }
      const friendIds = currentUser.friends.map(friend => friend._id);

      // Sort posts: friends' posts first, then others
      const sortedPosts = posts.sort((a, b) => {
        const aIsFriend = friendIds.some(id => id.toString() === a.author._id.toString());
        const bIsFriend = friendIds.some(id => id.toString() === b.author._id.toString());

        if (aIsFriend && !bIsFriend) return -1;
        if (!aIsFriend && bIsFriend) return 1;

        // If both are friends or both are not friends, sort by creation date
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      return NextResponse.json(sortedPosts);
    }

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // Check ban status
    const { banned, session, user } = await checkBanStatus(request);
    if (banned) {
      return NextResponse.json({ error: 'Account has been banned' }, { status: 403 });
    }
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, images = [], visibility = 'public' } = await request.json();

    // Allow post with either content or images
    if ((!content || content.trim().length === 0) && (!images || images.length === 0)) {
      return NextResponse.json({ error: 'Post must have either content or images' }, { status: 400 });
    }

    if (content && content.length > 2000) {
      return NextResponse.json({ error: 'Content too long' }, { status: 400 });
    }

    // Validate visibility
    if (!['public', 'followers', 'private'].includes(visibility)) {
      return NextResponse.json({ error: 'Invalid visibility setting' }, { status: 400 });
    }

    await connectDB();

    // Use user from checkBanStatus
    const currentUser = user;

    const post = await Post.create({
      author: currentUser._id,
      content: content?.trim() || '',
      images: images || [],
      visibility: visibility
    });

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username displayName avatar role customBadges publicTitles');

    // Notify friends about new post
    try {
      const friendRequests = await FriendRequest.find({
        $or: [
          { sender: currentUser._id, status: 'accepted' },
          { receiver: currentUser._id, status: 'accepted' }
        ]
      }).populate('sender receiver', 'username displayName avatar');

      for (const friendRequest of friendRequests) {
        const friendId = friendRequest.sender._id.toString() === currentUser._id.toString()
          ? friendRequest.receiver._id
          : friendRequest.sender._id;

        // Create notification for friend
        await Notification.create({
          recipient: friendId,
          sender: currentUser._id,
          type: 'new_post',
          message: `${currentUser.displayName} โพสต์ใหม่`,
          relatedPost: post._id
        });

        // Emit real-time notification to friend
        emitToFeed('notification', {
          userId: friendId.toString(),
          type: 'new_post',
          message: `${currentUser.displayName} โพสต์ใหม่`,
          sender: {
            _id: currentUser._id,
            displayName: currentUser.displayName,
            avatar: currentUser.avatar
          },
          relatedPost: {
            _id: post._id,
            content: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : '')
          }
        });
      }
    } catch (error) {
      console.error('Error notifying friends:', error);
    }

    // Emit real-time event for new post
    try {
      emitToFeed('new-post', populatedPost);
    } catch (error) {
      console.error('Socket emit error:', error);
    }

    return NextResponse.json(populatedPost, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
