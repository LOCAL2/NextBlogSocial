import NextAuth from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
// Temporarily comment out Supabase import until we complete migration
// import { UserService } from '../src/lib/database';

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
      // Temporarily disable user ban checking until Supabase migration is complete
      return true;
    },
    async session({ session, token }) {
      if (session?.user && token) {
        // Temporarily use basic session data until Supabase migration is complete
        session.user.id = token.sub;
        session.user.role = token.role || 'user';
        session.user.username = token.username;
        session.user.discordId = token.discordId;
        session.user.isActive = true;
        session.user.customBadges = [];
        session.user.publicTitles = [];
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      if (account && profile) {
        // Temporarily use basic JWT data until Supabase migration is complete
        const adminIds = process.env.ADMIN_DISCORD_IDS?.split(',') || [];
        const devIds = process.env.DEV_DISCORD_IDS?.split(',') || [];

        let userRole = 'user';
        if (adminIds.includes(profile.id)) {
          userRole = 'admin';
        } else if (devIds.includes(profile.id)) {
          userRole = 'moderator';
        }

        token.sub = profile.id; // Use Discord ID as temporary ID
        token.role = userRole;
        token.username = profile.username;
        token.discordId = profile.id;
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
