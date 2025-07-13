# 🚀 NextBlog Social - Supabase Migration Guide

## 📋 Overview

This guide will help you migrate from MongoDB to Supabase with real-time features.

## 🛠️ Setup Steps

### 1. Create Supabase Project

1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Wait for the project to be ready

### 2. Run Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the entire content of `supabase-schema.sql`
4. Click **Run** to execute the schema

### 3. Configure Environment Variables

Update your `.env.local` file:

```env
# Remove MongoDB variables
# MONGODB_URI=...

# Add Supabase variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Where to find these values:**
- Go to Project Settings → API
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public key
- `SUPABASE_SERVICE_ROLE_KEY` = service_role secret key

### 4. Install Dependencies

```bash
npm install @supabase/supabase-js
npm uninstall @auth/mongodb-adapter mongodb mongoose
```

### 5. Update API Routes

All API routes need to be updated to use Supabase instead of MongoDB. The new database service layer provides:

- `UserService` - User operations
- `PostService` - Post operations  
- `CommentService` - Comment operations
- `FollowService` - Follow operations
- `FriendService` - Friend operations
- `NotificationService` - Notification operations

### 6. Enable Real-time Features

The schema automatically enables real-time subscriptions for:
- User online status
- Posts (create, update, delete)
- Comments (create, update, delete)
- Likes (post and comment)
- Follows
- Friend requests
- Notifications

## 🔄 Real-time Usage Examples

### Subscribe to User Online Status
```javascript
import { subscribeToUserOnlineStatus } from '../lib/supabase'

const subscription = subscribeToUserOnlineStatus((payload) => {
  console.log('User online status changed:', payload)
  // Update UI accordingly
})

// Cleanup
unsubscribeFromChannel(subscription)
```

### Subscribe to Post Changes
```javascript
import { subscribeToPostChanges } from '../lib/supabase'

const subscription = subscribeToPostChanges((payload) => {
  if (payload.eventType === 'INSERT') {
    // New post created
  } else if (payload.eventType === 'UPDATE') {
    // Post updated
  } else if (payload.eventType === 'DELETE') {
    // Post deleted
  }
})
```

### Subscribe to Comments
```javascript
import { subscribeToCommentChanges } from '../lib/supabase'

const subscription = subscribeToCommentChanges(postId, (payload) => {
  // Handle comment changes for specific post
})
```

## 🔐 Row Level Security (RLS)

The schema includes comprehensive RLS policies:

- **Users**: Can view all profiles, update own profile
- **Posts**: Visibility-based access (public, followers, private)
- **Comments**: Access based on post visibility
- **Likes**: Users can manage their own likes
- **Follows**: Users can manage their own follows
- **Friends**: Users can manage their own friend relationships
- **Notifications**: Users can only see their own notifications

## 📊 Database Features

### Automatic Counters
- Post likes count
- Comment likes count  
- Post comments count

### Triggers
- `updated_at` timestamps
- Counter updates
- Real-time notifications

### Views
- `user_stats` - Aggregated user statistics

### Indexes
- Optimized for common queries
- Performance-focused design

## 🧪 Testing

1. **Start the application:**
   ```bash
   npm run dev:socket
   ```

2. **Test real-time features:**
   - Open multiple browser tabs
   - Login with different Discord accounts
   - Test likes, comments, follows in real-time

3. **Verify data:**
   - Check Supabase dashboard → Table Editor
   - Verify real-time subscriptions in Network tab

## 🚨 Important Notes

### Data Migration
- This is a **fresh start** - existing MongoDB data won't be migrated
- Users will need to re-login to create accounts in Supabase
- Consider exporting important data from MongoDB if needed

### Authentication
- NextAuth still handles Discord OAuth
- User data is now stored in Supabase
- Session management remains the same

### Real-time Performance
- Supabase real-time is optimized for performance
- Built-in connection pooling
- Automatic reconnection handling

### Security
- RLS policies enforce data access rules
- Service role key should be kept secret
- Anon key is safe for client-side use

## 🔧 Troubleshooting

### Common Issues

1. **Connection errors:**
   - Verify environment variables
   - Check Supabase project status
   - Ensure correct URL format

2. **RLS policy errors:**
   - Check if user is authenticated
   - Verify policy conditions
   - Use service role for admin operations

3. **Real-time not working:**
   - Check browser console for errors
   - Verify real-time is enabled in Supabase
   - Check subscription setup

### Debug Mode

Enable debug logging:
```javascript
import { supabase } from '../lib/supabase'

// Enable debug mode
supabase.realtime.setAuth('your-jwt-token')
```

## 🎉 Benefits of Supabase

- **Real-time out of the box**
- **Built-in authentication**
- **Row Level Security**
- **Automatic API generation**
- **Better performance**
- **Easier scaling**
- **Built-in dashboard**
- **TypeScript support**

## 📚 Next Steps

1. Test all features thoroughly
2. Monitor performance in Supabase dashboard
3. Set up database backups
4. Configure production environment
5. Update deployment configuration

Your NextBlog Social app is now powered by Supabase with real-time features! 🚀
