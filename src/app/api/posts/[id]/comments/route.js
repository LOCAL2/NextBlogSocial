import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import connectDB from '../../../../../../lib/mongodb';
import Comment from '../../../../../../models/Comment';
import Post from '../../../../../../models/Post';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await connectDB();

    // Check if post exists
    const post = await Post.findById(id);
    if (!post || post.isDeleted) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Fetch comments for this post
    const comments = await Comment.find({ 
      post: id, 
      isDeleted: false,
      parentComment: null // Only top-level comments
    })
    .populate('author', 'username displayName avatar')
    .populate({
      path: 'replies',
      populate: {
        path: 'author',
        select: 'username displayName avatar'
      }
    })
    .sort({ createdAt: -1 });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
