import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import Post from '../../../../models/Post';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type'); // 'users', 'posts', or 'all'

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    await connectDB();

    const results = {
      users: [],
      posts: []
    };

    // Search users
    if (!type || type === 'users' || type === 'all') {
      const users = await User.find({
        $and: [
          { isActive: true },
          { _id: { $ne: session.user.id } }, // Exclude current user
          {
            $or: [
              { username: { $regex: query, $options: 'i' } },
              { displayName: { $regex: query, $options: 'i' } }
            ]
          }
        ]
      })
      .select('username displayName avatar bio role customBadges publicTitles createdAt')
      .limit(20);

      results.users = users;
    }

    // Search posts
    if (!type || type === 'posts' || type === 'all') {
      const posts = await Post.find({
        $and: [
          { isDeleted: false },
          { content: { $regex: query, $options: 'i' } }
        ]
      })
      .populate('author', 'username displayName avatar role customBadges publicTitles')
      .sort({ createdAt: -1 })
      .limit(20);

      results.posts = posts;
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
