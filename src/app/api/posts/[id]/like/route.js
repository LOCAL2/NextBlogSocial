import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import connectDB from '../../../../../../lib/mongodb';
import Post from '../../../../../../models/Post';
import User from '../../../../../../models/User';
import { emitToFeed } from '../../../../../../lib/socket';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await connectDB();

    // Get current user
    const currentUser = await User.findOne({ discordId: session.user.discordId });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const post = await Post.findById(id);
    if (!post || post.isDeleted) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if user already liked the post
    const existingLike = post.likes.find(like => like.user.toString() === currentUser._id.toString());

    if (existingLike) {
      // Unlike the post
      post.likes = post.likes.filter(like => like.user.toString() !== currentUser._id.toString());
    } else {
      // Like the post
      post.likes.push({
        user: currentUser._id,
        createdAt: new Date()
      });
    }

    await post.save();

    // Populate the post for response
    const updatedPost = await Post.findById(id)
      .populate('author', 'username displayName avatar')
      .populate('likes.user', 'username displayName avatar');

    // Emit real-time event
    try {
      emitToFeed('post-liked', {
        postId: updatedPost._id,
        likesCount: updatedPost.likes.length,
        isLiked: !existingLike
      });
    } catch (error) {
      console.error('Socket emit error:', error);
    }

    return NextResponse.json({
      success: true,
      likesCount: updatedPost.likes.length,
      isLiked: !existingLike,
      likes: updatedPost.likes
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
