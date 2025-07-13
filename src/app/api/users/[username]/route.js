import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import User from '../../../../../models/User';

export async function GET(request, { params }) {
  try {
    const { username } = await params;

    await connectDB();

    const user = await User.findOne({
      username: username,
      isActive: true
    }).select('username displayName avatar bio createdAt role customBadges publicTitles');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
