import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';
import connectDB from './mongodb';
import User from '../models/User';

export async function checkBanStatus(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.discordId) {
      return { banned: false, session: null };
    }

    await connectDB();
    const user = await User.findOne({ discordId: session.user.discordId });
    
    if (!user || !user.isActive) {
      return { banned: true, session: null };
    }

    return { banned: false, session, user };
  } catch (error) {
    console.error('Error checking ban status:', error);
    return { banned: true, session: null };
  }
}
