import { supabase } from './supabase'

export function SupabaseAdapter() {
  return {
    async createUser(user) {
      const userData = {
        discord_id: user.id,
        username: user.username || user.name,
        display_name: user.name,
        email: user.email,
        avatar_url: user.image,
        role: 'user',
        is_banned: false,
        is_online: true
      }

      const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single()

      if (error) throw error
      return {
        id: data.id,
        name: data.display_name,
        username: data.username,
        email: data.email,
        image: data.avatar_url,
        role: data.role
      }
    },

    async getUser(id) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('discord_id', id)
        .single()

      if (error || !data) return null

      return {
        id: data.discord_id,
        name: data.display_name,
        username: data.username,
        email: data.email,
        image: data.avatar_url,
        role: data.role,
        isBanned: data.is_banned,
        banReason: data.ban_reason
      }
    },

    async getUserByEmail(email) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (error || !data) return null

      return {
        id: data.discord_id,
        name: data.display_name,
        username: data.username,
        email: data.email,
        image: data.avatar_url,
        role: data.role
      }
    },

    async getUserByAccount({ providerAccountId, provider }) {
      if (provider !== 'discord') return null

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('discord_id', providerAccountId)
        .single()

      if (error || !data) return null

      return {
        id: data.discord_id,
        name: data.display_name,
        username: data.username,
        email: data.email,
        image: data.avatar_url,
        role: data.role,
        isBanned: data.is_banned,
        banReason: data.ban_reason
      }
    },

    async updateUser(user) {
      const { data, error } = await supabase
        .from('users')
        .update({
          display_name: user.name,
          email: user.email,
          avatar_url: user.image
        })
        .eq('discord_id', user.id)
        .select()
        .single()

      if (error) throw error

      return {
        id: data.discord_id,
        name: data.display_name,
        username: data.username,
        email: data.email,
        image: data.avatar_url,
        role: data.role
      }
    },

    async linkAccount(account) {
      // For Discord OAuth, we don't need separate account linking
      // since we store Discord ID directly in users table
      return account
    },

    async unlinkAccount({ providerAccountId, provider }) {
      // Not implemented for Discord OAuth
      return
    },

    async createSession({ sessionToken, userId, expires }) {
      // We'll handle sessions with NextAuth's default JWT strategy
      return {
        sessionToken,
        userId,
        expires
      }
    },

    async getSessionAndUser(sessionToken) {
      // We'll handle sessions with NextAuth's default JWT strategy
      return null
    },

    async updateSession({ sessionToken, expires }) {
      // We'll handle sessions with NextAuth's default JWT strategy
      return null
    },

    async deleteSession(sessionToken) {
      // We'll handle sessions with NextAuth's default JWT strategy
      return
    },

    async createVerificationToken({ identifier, expires, token }) {
      // Not needed for Discord OAuth
      return { identifier, expires, token }
    },

    async useVerificationToken({ identifier, token }) {
      // Not needed for Discord OAuth
      return null
    }
  }
}
