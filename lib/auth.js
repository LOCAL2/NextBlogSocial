import NextAuth from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import connectDB from './mongodb';
import User from '../models/User';

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'identify email'
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account && profile) {
        try {
          await connectDB();
          const existingUser = await User.findOne({ discordId: profile.id });

          // Check if user is banned
          if (existingUser && !existingUser.isActive) {
            return false; // Prevent sign in for banned users
          }
        } catch (error) {
          console.error('Error checking user ban status:', error);
          return false;
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session?.user && token) {
        try {
          await connectDB();
          const currentUser = await User.findById(token.sub);

          // Check if user is banned
          if (!currentUser || !currentUser.isActive) {
            throw new Error('Account has been banned');
          }

          session.user.id = token.sub;
          session.user.role = currentUser.role;
          session.user.username = currentUser.username;
          session.user.discordId = currentUser.discordId;
          session.user.isActive = currentUser.isActive;
          session.user.customBadges = currentUser.customBadges || [];
          session.user.publicTitles = currentUser.publicTitles || [];
        } catch (error) {
          console.error('Error in session callback:', error);
          throw error;
        }
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      if (account && profile) {
        try {
          await connectDB();

          // Check if user exists
          let existingUser = await User.findOne({ discordId: profile.id });

          if (!existingUser) {
            // Create new user
            const adminIds = process.env.ADMIN_DISCORD_IDS?.split(',') || [];
            const devIds = process.env.DEV_DISCORD_IDS?.split(',') || [];

            let userRole = 'user';
            if (adminIds.includes(profile.id)) {
              userRole = 'admin';
            } else if (devIds.includes(profile.id)) {
              userRole = 'dev';
            }

            existingUser = await User.create({
              discordId: profile.id,
              username: profile.username,
              displayName: profile.global_name || profile.username,
              avatar: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : null,
              email: profile.email,
              role: userRole,
              lastLogin: new Date()
            });
          } else {
            // Check if user is banned
            if (!existingUser.isActive) {
              throw new Error('Account has been banned');
            }

            // Update last login
            existingUser.lastLogin = new Date();
            await existingUser.save();
          }

          token.sub = existingUser._id.toString();
          token.role = existingUser.role;
          token.username = existingUser.username;
          token.discordId = existingUser.discordId;
        } catch (error) {
          console.error('Error in JWT callback:', error);
        }
      }
      return token;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt'
  },
  secret: process.env.NEXTAUTH_SECRET
};

export default NextAuth(authOptions);
