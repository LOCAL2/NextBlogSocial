# 🌐 ngrok Setup Guide

## 📋 Quick Setup Steps

### 1. Install ngrok
```bash
# Option 1: Using npm
npm install -g ngrok

# Option 2: Download from https://ngrok.com/download
```

### 2. Start the Application
```bash
# Terminal 1: Start the server
node server.js
```

### 3. Start ngrok
```bash
# Terminal 2: Start ngrok tunnel
ngrok http 3000
```

You'll see output like:
```
Session Status                online
Account                       your-account
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:3000
```

### 4. Update Environment Variables

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`) and update `.env.local`:

```env
NEXTAUTH_URL=https://abc123.ngrok.io
```

### 5. Update Discord OAuth

In Discord Developer Portal:
1. Go to Applications → Your App → OAuth2
2. Add redirect URI: `https://abc123.ngrok.io/api/auth/callback/discord`

### 6. Restart Server

After updating `.env.local`, restart the server:
```bash
# Stop the server (Ctrl+C) and restart
node server.js
```

## 🧪 Testing with Friends

### Share with Friends:
1. **Send them the ngrok URL:** `https://abc123.ngrok.io`
2. **They can access from anywhere** (no need to setup locally)
3. **Real-time features work** across different networks

### Test Scenarios:
1. **Different devices/networks**
2. **Mobile browsers**
3. **Multiple users simultaneously**
4. **Real-time follow/unfollow**
5. **Live comments and likes**

## 🔧 Troubleshooting

### Common Issues:

1. **Socket connection errors:**
   - Make sure `NEXTAUTH_URL` matches ngrok URL exactly
   - Restart server after changing environment variables

2. **Discord OAuth errors:**
   - Verify redirect URI in Discord matches ngrok URL
   - Check Discord app is public (not in development mode)

3. **ngrok session expired:**
   - Free ngrok URLs change on restart
   - Update `.env.local` with new URL
   - Update Discord redirect URI

### Pro Tips:

1. **Keep ngrok running** - URL changes when restarted
2. **Use ngrok web interface** at `http://127.0.0.1:4040` to monitor requests
3. **For permanent URL** - consider ngrok paid plan with custom domains

## 📱 Mobile Testing

ngrok makes mobile testing easy:
1. **Open ngrok URL on phone**
2. **Test touch interactions**
3. **Test real-time features**
4. **Test different screen sizes**

## 🌍 Global Testing

Friends can test from anywhere:
- ✅ Different countries
- ✅ Different ISPs
- ✅ Mobile networks
- ✅ Corporate networks
- ✅ Public WiFi

Perfect for comprehensive testing! 🚀
