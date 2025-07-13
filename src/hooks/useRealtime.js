import { useEffect, useRef, useState } from 'react'
import { 
  subscribeToUserOnlineStatus,
  subscribeToPostChanges,
  subscribeToCommentChanges,
  subscribeToLikeChanges,
  subscribeToCommentLikeChanges,
  subscribeToFollowChanges,
  subscribeToNotifications,
  unsubscribeFromChannel
} from '../lib/supabase'

// Hook for user online status
export function useUserOnlineStatus(callback) {
  const subscriptionRef = useRef(null)

  useEffect(() => {
    subscriptionRef.current = subscribeToUserOnlineStatus(callback)

    return () => {
      if (subscriptionRef.current) {
        unsubscribeFromChannel(subscriptionRef.current)
      }
    }
  }, [callback])

  return subscriptionRef.current
}

// Hook for post changes
export function usePostChanges(callback) {
  const subscriptionRef = useRef(null)

  useEffect(() => {
    subscriptionRef.current = subscribeToPostChanges(callback)

    return () => {
      if (subscriptionRef.current) {
        unsubscribeFromChannel(subscriptionRef.current)
      }
    }
  }, [callback])

  return subscriptionRef.current
}

// Hook for comment changes on specific post
export function useCommentChanges(postId, callback) {
  const subscriptionRef = useRef(null)

  useEffect(() => {
    if (postId) {
      subscriptionRef.current = subscribeToCommentChanges(postId, callback)
    }

    return () => {
      if (subscriptionRef.current) {
        unsubscribeFromChannel(subscriptionRef.current)
      }
    }
  }, [postId, callback])

  return subscriptionRef.current
}

// Hook for like changes
export function useLikeChanges(callback) {
  const subscriptionRef = useRef(null)

  useEffect(() => {
    subscriptionRef.current = subscribeToLikeChanges(callback)

    return () => {
      if (subscriptionRef.current) {
        unsubscribeFromChannel(subscriptionRef.current)
      }
    }
  }, [callback])

  return subscriptionRef.current
}

// Hook for comment like changes
export function useCommentLikeChanges(callback) {
  const subscriptionRef = useRef(null)

  useEffect(() => {
    subscriptionRef.current = subscribeToCommentLikeChanges(callback)

    return () => {
      if (subscriptionRef.current) {
        unsubscribeFromChannel(subscriptionRef.current)
      }
    }
  }, [callback])

  return subscriptionRef.current
}

// Hook for follow changes
export function useFollowChanges(userId, callback) {
  const subscriptionRef = useRef(null)

  useEffect(() => {
    if (userId) {
      subscriptionRef.current = subscribeToFollowChanges(userId, callback)
    }

    return () => {
      if (subscriptionRef.current) {
        unsubscribeFromChannel(subscriptionRef.current)
      }
    }
  }, [userId, callback])

  return subscriptionRef.current
}

// Hook for notifications
export function useNotifications(userId, callback) {
  const subscriptionRef = useRef(null)

  useEffect(() => {
    if (userId) {
      subscriptionRef.current = subscribeToNotifications(userId, callback)
    }

    return () => {
      if (subscriptionRef.current) {
        unsubscribeFromChannel(subscriptionRef.current)
      }
    }
  }, [userId, callback])

  return subscriptionRef.current
}

// Combined hook for all real-time features
export function useRealtimeFeatures(userId, callbacks = {}) {
  const subscriptions = useRef([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const subs = []

    // User online status
    if (callbacks.onUserOnlineStatus) {
      subs.push(subscribeToUserOnlineStatus(callbacks.onUserOnlineStatus))
    }

    // Post changes
    if (callbacks.onPostChange) {
      subs.push(subscribeToPostChanges(callbacks.onPostChange))
    }

    // Like changes
    if (callbacks.onLikeChange) {
      subs.push(subscribeToLikeChanges(callbacks.onLikeChange))
    }

    // Comment like changes
    if (callbacks.onCommentLikeChange) {
      subs.push(subscribeToCommentLikeChanges(callbacks.onCommentLikeChange))
    }

    // Follow changes
    if (userId && callbacks.onFollowChange) {
      subs.push(subscribeToFollowChanges(userId, callbacks.onFollowChange))
    }

    // Notifications
    if (userId && callbacks.onNotification) {
      subs.push(subscribeToNotifications(userId, callbacks.onNotification))
    }

    subscriptions.current = subs
    setIsConnected(true)

    return () => {
      subscriptions.current.forEach(sub => {
        if (sub) {
          unsubscribeFromChannel(sub)
        }
      })
      setIsConnected(false)
    }
  }, [userId, callbacks])

  return { isConnected, subscriptions: subscriptions.current }
}

// Hook for real-time posts feed
export function useRealtimePosts(initialPosts = []) {
  const [posts, setPosts] = useState(initialPosts)

  const handlePostChange = (payload) => {
    const { eventType, new: newPost, old: oldPost } = payload

    setPosts(currentPosts => {
      switch (eventType) {
        case 'INSERT':
          // Add new post to the beginning
          return [newPost, ...currentPosts]
        
        case 'UPDATE':
          // Update existing post
          return currentPosts.map(post => 
            post.id === newPost.id ? { ...post, ...newPost } : post
          )
        
        case 'DELETE':
          // Remove deleted post
          return currentPosts.filter(post => post.id !== oldPost.id)
        
        default:
          return currentPosts
      }
    })
  }

  const handleLikeChange = (payload) => {
    const { eventType, new: newLike, old: oldLike } = payload

    setPosts(currentPosts => {
      return currentPosts.map(post => {
        const likeData = newLike || oldLike
        if (post.id === likeData.post_id) {
          const updatedPost = { ...post }
          
          if (eventType === 'INSERT') {
            updatedPost.likes_count = (updatedPost.likes_count || 0) + 1
            updatedPost.post_likes = [...(updatedPost.post_likes || []), newLike]
          } else if (eventType === 'DELETE') {
            updatedPost.likes_count = Math.max((updatedPost.likes_count || 0) - 1, 0)
            updatedPost.post_likes = (updatedPost.post_likes || []).filter(
              like => like.user_id !== oldLike.user_id
            )
          }
          
          return updatedPost
        }
        return post
      })
    })
  }

  usePostChanges(handlePostChange)
  useLikeChanges(handleLikeChange)

  return [posts, setPosts]
}

// Hook for real-time comments
export function useRealtimeComments(postId, initialComments = []) {
  const [comments, setComments] = useState(initialComments)

  const handleCommentChange = (payload) => {
    const { eventType, new: newComment, old: oldComment } = payload

    setComments(currentComments => {
      switch (eventType) {
        case 'INSERT':
          return [...currentComments, newComment]
        
        case 'UPDATE':
          return currentComments.map(comment => 
            comment.id === newComment.id ? { ...comment, ...newComment } : comment
          )
        
        case 'DELETE':
          return currentComments.filter(comment => comment.id !== oldComment.id)
        
        default:
          return currentComments
      }
    })
  }

  const handleCommentLikeChange = (payload) => {
    const { eventType, new: newLike, old: oldLike } = payload

    setComments(currentComments => {
      return currentComments.map(comment => {
        const likeData = newLike || oldLike
        if (comment.id === likeData.comment_id) {
          const updatedComment = { ...comment }
          
          if (eventType === 'INSERT') {
            updatedComment.likes_count = (updatedComment.likes_count || 0) + 1
            updatedComment.comment_likes = [...(updatedComment.comment_likes || []), newLike]
          } else if (eventType === 'DELETE') {
            updatedComment.likes_count = Math.max((updatedComment.likes_count || 0) - 1, 0)
            updatedComment.comment_likes = (updatedComment.comment_likes || []).filter(
              like => like.user_id !== oldLike.user_id
            )
          }
          
          return updatedComment
        }
        return comment
      })
    })
  }

  useCommentChanges(postId, handleCommentChange)
  useCommentLikeChanges(handleCommentLikeChange)

  return [comments, setComments]
}
