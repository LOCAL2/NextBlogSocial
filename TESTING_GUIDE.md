# 🧪 Testing Guide - NextBlog Social

## 📋 Prerequisites

1. **Node.js** (v18 or higher)
2. **MongoDB** (running on localhost:27017)
3. **Discord Application** (for OAuth)

## 🚀 Setup Instructions

### 1. Clone & Install
```bash
git clone <repository-url>
cd nextblog-social
npm install
```

### 2. Environment Setup
```bash
# Copy example environment file
cp .env.example .env.local

# Edit .env.local with your values:
# - Get Discord Client ID/Secret from https://discord.com/developers/applications
# - Generate random strings for NEXTAUTH_SECRET and JWT_SECRET
# - Add your Discord ID to ADMIN_DISCORD_IDS
```

### 3. Database Setup
```bash
# Make sure MongoDB is running
mongod

# The app will create the database automatically
```

### 4. Start the Application

#### Option 1: Local Testing
```bash
# Start the Socket.IO server
node server.js

# The app will be available at http://localhost:3000
```

#### Option 2: Public Testing with ngrok
```bash
# Install ngrok (if not installed)
npm install -g ngrok

# Start the Socket.IO server
node server.js

# In another terminal, start ngrok
ngrok http 3000

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
# Update .env.local with the ngrok URL:
# NEXTAUTH_URL=https://abc123.ngrok.io

# Update Discord OAuth redirect URI to:
# https://abc123.ngrok.io/api/auth/callback/discord

# Restart the server after updating .env.local
```

## 🧪 Testing Real-time Follow System

### Test Scenario 1: Follow/Unfollow Real-time Updates

1. **Open 2 browser tabs/windows**
2. **Login with different Discord accounts in each tab**
3. **In Tab 1 (User A):**
   - Create a post with visibility "followers"
   - Note: Tab 2 should NOT see this post
4. **In Tab 2 (User B):**
   - Follow User A
   - **Expected:** Post should appear immediately without refresh
5. **In Tab 2 (User B):**
   - Unfollow User A
   - **Expected:** Post should disappear immediately without refresh

### Test Scenario 2: Posts Visibility

1. **User A creates posts with different visibility:**
   - Public: Everyone can see
   - Followers: Only followers can see
   - Private: Only the author can see
2. **User B (not following A):**
   - Should only see public posts
3. **User B follows User A:**
   - Should see public + followers posts
4. **User B unfollows User A:**
   - Should only see public posts again

### Test Scenario 3: Real-time Comments

1. **User A creates a post**
2. **User B comments on the post**
3. **Expected:** Comment appears in real-time for User A
4. **User A replies to User B's comment**
5. **Expected:** Reply appears in real-time for User B

## 🔍 Debugging

### Check Browser Console
Open Developer Tools (F12) and look for:
```
🔌 Connected to socket server
🌍 Joined global feed room
👥 Received follow-updated event: {...}
🔄 Refreshing posts due to follow/unfollow action
```

### Check Server Logs
Look for:
```
📝 Creating follow record: [user_id] -> [target_user_id]
✅ Follow record created: {...}
🔔 Emitting follow event: [user_id] followed [target_user_id]
📤 Emitting follow-updated to global feed
👥 User [user_id] follows: [target_user_id]
```

### Common Issues

1. **Socket connection errors:**
   - Make sure `NEXTAUTH_URL=http://localhost:3000` in .env.local
   - Restart the server with `npm run dev:socket`

2. **Posts not updating in real-time:**
   - Check browser console for socket events
   - Verify users are in global-feed room

3. **Follow system not working:**
   - Check MongoDB connection
   - Verify Follow records are created in database

## 📱 Features to Test

- ✅ User authentication (Discord OAuth)
- ✅ Create posts with visibility settings
- ✅ Follow/unfollow users
- ✅ Real-time post visibility updates
- ✅ Comment system with nested replies
- ✅ Real-time like/unlike
- ✅ User search
- ✅ Notifications
- ✅ Online status indicators

## 🆘 Need Help?

If you encounter issues:
1. Check the console logs (both browser and server)
2. Verify environment variables are set correctly
3. Make sure MongoDB is running
4. Restart the server if needed

Happy testing! 🎉
