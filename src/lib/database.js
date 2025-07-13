import { supabase, getUserByDiscordId, upsertUser } from './supabase'

// User operations
export class UserService {
  static async findByDiscordId(discordId) {
    return await getUserByDiscordId(discordId)
  }

  static async createOrUpdate(userData) {
    return await upsertUser(userData)
  }

  static async updateOnlineStatus(userId, isOnline) {
    const { data, error } = await supabase
      .from('users')
      .update({ 
        is_online: isOnline,
        last_seen: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async searchUsers(query) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, role, is_online')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(20)

    if (error) throw error
    return data
  }

  static async getUserStats(userId) {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data
  }

  static async getUserTitles(userId) {
    const { data, error } = await supabase
      .from('user_title_assignments')
      .select(`
        user_titles(
          id,
          name,
          description,
          color,
          icon
        )
      `)
      .eq('user_id', userId)

    if (error) throw error
    return data.map(item => item.user_titles)
  }

  static async getUserBadges(userId) {
    const { data, error } = await supabase
      .from('user_badge_assignments')
      .select(`
        user_badges(
          id,
          name,
          description,
          color,
          icon
        )
      `)
      .eq('user_id', userId)

    if (error) throw error
    return data.map(item => item.user_badges)
  }
}

// Post operations
export class PostService {
  static async create(postData) {
    const { data, error } = await supabase
      .from('posts')
      .insert(postData)
      .select(`
        *,
        author:users!posts_author_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          role
        )
      `)
      .single()

    if (error) throw error
    return data
  }

  static async getById(postId) {
    const { data, error } = await supabase
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
      .eq('id', postId)
      .eq('is_deleted', false)
      .single()

    if (error) throw error
    return data
  }

  static async update(postId, updates) {
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', postId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async delete(postId) {
    const { data, error } = await supabase
      .from('posts')
      .update({ is_deleted: true })
      .eq('id', postId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async like(postId, userId) {
    const { data, error } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: userId })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async unlike(postId, userId) {
    const { data, error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId)

    if (error) throw error
    return data
  }

  static async getLikes(postId) {
    const { data, error } = await supabase
      .from('post_likes')
      .select(`
        user_id,
        created_at,
        users!post_likes_user_id_fkey(
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async searchPosts(query) {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:users!posts_author_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          role
        )
      `)
      .textSearch('content', query)
      .eq('is_deleted', false)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return data
  }
}

// Comment operations
export class CommentService {
  static async create(commentData) {
    const { data, error } = await supabase
      .from('comments')
      .insert(commentData)
      .select(`
        *,
        author:users!comments_author_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          role
        )
      `)
      .single()

    if (error) throw error
    return data
  }

  static async update(commentId, updates) {
    const { data, error } = await supabase
      .from('comments')
      .update(updates)
      .eq('id', commentId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async delete(commentId, deletedBy, reason) {
    const { data, error } = await supabase
      .from('comments')
      .update({ 
        is_deleted: true,
        deleted_by: deletedBy,
        delete_reason: reason
      })
      .eq('id', commentId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async like(commentId, userId) {
    const { data, error } = await supabase
      .from('comment_likes')
      .insert({ comment_id: commentId, user_id: userId })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async unlike(commentId, userId) {
    const { data, error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', userId)

    if (error) throw error
    return data
  }
}

// Follow operations
export class FollowService {
  static async follow(followerId, followingId) {
    const { data, error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async unfollow(followerId, followingId) {
    const { data, error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId)

    if (error) throw error
    return data
  }

  static async getFollowers(userId) {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        follower_id,
        users!follows_follower_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          role,
          is_online
        )
      `)
      .eq('following_id', userId)

    if (error) throw error
    return data.map(item => item.users)
  }

  static async getFollowing(userId) {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        following_id,
        users!follows_following_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          role,
          is_online
        )
      `)
      .eq('follower_id', userId)

    if (error) throw error
    return data.map(item => item.users)
  }
}

// Friend operations
export class FriendService {
  static async sendRequest(requesterId, addresseeId) {
    const { data, error } = await supabase
      .from('friends')
      .insert({ 
        requester_id: requesterId, 
        addressee_id: addresseeId,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async acceptRequest(requestId) {
    const { data, error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async rejectRequest(requestId) {
    const { data, error } = await supabase
      .from('friends')
      .delete()
      .eq('id', requestId)

    if (error) throw error
    return data
  }

  static async removeFriend(userId1, userId2) {
    const { data, error } = await supabase
      .from('friends')
      .delete()
      .or(`and(requester_id.eq.${userId1},addressee_id.eq.${userId2}),and(requester_id.eq.${userId2},addressee_id.eq.${userId1})`)

    if (error) throw error
    return data
  }

  static async getFriends(userId) {
    const { data, error } = await supabase
      .from('friends')
      .select(`
        requester_id,
        addressee_id,
        requester:users!friends_requester_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          role,
          is_online
        ),
        addressee:users!friends_addressee_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          role,
          is_online
        )
      `)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

    if (error) throw error
    
    return data.map(item => 
      item.requester_id === userId ? item.addressee : item.requester
    )
  }

  static async getFriendRequests(userId) {
    const { data, error } = await supabase
      .from('friends')
      .select(`
        *,
        requester:users!friends_requester_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          role
        )
      `)
      .eq('addressee_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }
}

// Notification operations
export class NotificationService {
  static async create(notificationData) {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async markAsRead(notificationId) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async markAllAsRead(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', userId)
      .eq('is_read', false)

    if (error) throw error
    return data
  }
}
