import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We'll handle auth with NextAuth
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Helper function to get user by Discord ID
export async function getUserByDiscordId(discordId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('discord_id', discordId)
    .single()
  
  if (error && error.code !== 'PGRST116') {
    throw error
  }
  
  return data
}

// Helper function to create or update user
export async function upsertUser(userData) {
  const { data, error } = await supabase
    .from('users')
    .upsert(userData, { 
      onConflict: 'discord_id',
      ignoreDuplicates: false 
    })
    .select()
    .single()
  
  if (error) {
    throw error
  }
  
  return data
}

// Helper function to get posts with author info
export async function getPostsWithAuthor(filters = {}) {
  let query = supabase
    .from('posts')
    .select(`
      *,
      author:users!posts_author_id_fkey(
        id,
        username,
        display_name,
        avatar_url,
        role
      ),
      post_likes(
        user_id,
        users!post_likes_user_id_fkey(username)
      )
    `)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  // Apply visibility filters
  if (filters.userId) {
    query = query.or(`visibility.eq.public,and(visibility.eq.followers,author_id.eq.${filters.userId}),and(visibility.eq.private,author_id.eq.${filters.userId})`)
  } else {
    query = query.eq('visibility', 'public')
  }

  // Apply author filter
  if (filters.authorId) {
    query = query.eq('author_id', filters.authorId)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data
}

// Helper function to get comments with author info
export async function getCommentsForPost(postId) {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      author:users!comments_author_id_fkey(
        id,
        username,
        display_name,
        avatar_url,
        role
      ),
      comment_likes(
        user_id,
        users!comment_likes_user_id_fkey(username)
      )
    `)
    .eq('post_id', postId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return data
}

// Helper function to check if user follows another user
export async function checkFollowStatus(followerId, followingId) {
  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return !!data
}

// Helper function to get user's followers/following
export async function getUserFollows(userId, type = 'followers') {
  const column = type === 'followers' ? 'following_id' : 'follower_id'
  const selectColumn = type === 'followers' ? 'follower_id' : 'following_id'
  
  const { data, error } = await supabase
    .from('follows')
    .select(`
      ${selectColumn},
      users!follows_${selectColumn}_fkey(
        id,
        username,
        display_name,
        avatar_url,
        role,
        is_online
      )
    `)
    .eq(column, userId)

  if (error) {
    throw error
  }

  return data.map(item => item.users)
}

// Helper function to get friend status
export async function getFriendStatus(userId1, userId2) {
  const { data, error } = await supabase
    .from('friends')
    .select('*')
    .or(`and(requester_id.eq.${userId1},addressee_id.eq.${userId2}),and(requester_id.eq.${userId2},addressee_id.eq.${userId1})`)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return data
}

// Helper function to get user notifications
export async function getUserNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      sender:users!notifications_sender_id_fkey(
        username,
        display_name,
        avatar_url
      ),
      related_post:posts(
        id,
        content
      )
    `)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    throw error
  }

  return data
}

// Real-time subscription helpers
export function subscribeToTable(table, callback, filter = null) {
  let subscription = supabase
    .channel(`${table}_changes`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: table,
        ...(filter && { filter })
      }, 
      callback
    )
    .subscribe()

  return subscription
}

export function subscribeToUserOnlineStatus(callback) {
  return subscribeToTable('users', (payload) => {
    if (payload.eventType === 'UPDATE' && 'is_online' in payload.new) {
      callback(payload)
    }
  })
}

export function subscribeToPostChanges(callback) {
  return subscribeToTable('posts', callback)
}

export function subscribeToCommentChanges(postId, callback) {
  return subscribeToTable('comments', callback, `post_id=eq.${postId}`)
}

export function subscribeToLikeChanges(callback) {
  return subscribeToTable('post_likes', callback)
}

export function subscribeToCommentLikeChanges(callback) {
  return subscribeToTable('comment_likes', callback)
}

export function subscribeToFollowChanges(userId, callback) {
  return subscribeToTable('follows', callback, `follower_id=eq.${userId}`)
}

export function subscribeToNotifications(userId, callback) {
  return subscribeToTable('notifications', callback, `recipient_id=eq.${userId}`)
}

// Cleanup function
export function unsubscribeFromChannel(subscription) {
  if (subscription) {
    supabase.removeChannel(subscription)
  }
}
