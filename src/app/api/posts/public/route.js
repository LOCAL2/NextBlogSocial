import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/mongodb';
import Post from '../../../../../models/Post';
import User from '../../../../../models/User';
import Comment from '../../../../../models/Comment';
import Follow from '../../../../../models/Follow';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    await connectDB();

    let query = { isDeleted: false };

    // Apply visibility rules based on user authentication and relationships
    if (userId) {
      // If viewing specific user's posts
      query.author = userId;

      // If viewing someone else's profile, apply visibility rules
      if (session && session.user.id !== userId) {
        const currentUser = await User.findOne({ discordId: session.user.discordId });
        const targetUser = await User.findById(userId);

        if (currentUser && targetUser) {
          // Check if current user follows the target user
          const isFollowing = await Follow.findOne({
            follower: currentUser._id,
            following: userId
          });
          const isOwnProfile = currentUser._id.toString() === userId;

          if (!isOwnProfile && !isFollowing) {
            // Not following, only show public posts
            query.visibility = 'public';
          } else if (isFollowing) {
            // Following can see public and followers posts
            query.visibility = { $in: ['public', 'followers'] };
          }
          // If it's own profile, show all posts (no visibility filter)
        } else {
          // Not logged in or user not found, only show public posts
          query.visibility = 'public';
        }
      }
    } else {
      // General feed - apply visibility rules
      if (session) {
        // Logged in user - can see public and followers posts from followed users
        const currentUser = await User.findOne({ discordId: session.user.discordId });
        if (currentUser) {
          // Get list of users that current user follows
          const followingList = await Follow.find({ follower: currentUser._id }).select('following');
          const followingIds = followingList.map(follow => follow.following.toString());

          console.log(`👥 User ${currentUser._id} (${currentUser.username}) follows: [${followingIds.join(', ')}]`);
          console.log(`📋 Following list details:`, followingList.map(f => f.following.toString()));

          query = {
            ...query,
            $or: [
              { visibility: 'public' }, // All public posts
              {
                visibility: 'followers',
                author: { $in: [...followingIds, currentUser._id.toString()] } // Followers posts from followed users and self
              },
              {
                visibility: 'private',
                author: currentUser._id // Only own private posts
              }
            ]
          };
        } else {
          // User not found, only public posts
          query.visibility = 'public';
        }
      } else {
        // Not logged in - only public posts
        query.visibility = 'public';
      }
    }

    // Debug logging
    console.log('📊 Posts query:', JSON.stringify(query, null, 2));
    console.log('🔍 Session user:', session?.user?.discordId);
    console.log('👤 Viewing userId:', userId);

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

    console.log(`📈 Found ${posts.length} posts`);
    console.log('🎯 Posts visibility:', posts.map(p => ({ id: p._id, visibility: p.visibility, author: p.author.username })));

    // If user is logged in and no userId filter, sort posts with friend priority
    if (session && !userId) {
      try {
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
      } catch (error) {
        console.error('Error sorting posts by friends:', error);
        // If error, just return posts sorted by date
        return NextResponse.json(posts);
      }
    }

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching public posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
