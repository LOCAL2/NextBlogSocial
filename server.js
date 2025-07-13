const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(server, {
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['polling', 'websocket'],
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    allowEIO3: true
  });

  // Connect to MongoDB for user status updates
  const connectDB = async () => {
    try {
      if (mongoose.connections[0].readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected for socket server');
      }
    } catch (error) {
      console.error('MongoDB connection error:', error);
    }
  };

  const updateUserOnlineStatus = async (userId, isOnline) => {
    try {
      await connectDB();

      // Use MongoDB collection directly instead of Mongoose model
      const db = mongoose.connection.db;
      const usersCollection = db.collection('users');

      const updateResult = await usersCollection.updateOne(
        { _id: new mongoose.Types.ObjectId(userId) },
        {
          $set: {
            isOnline: isOnline,
            lastSeen: new Date()
          }
        }
      );

      console.log(`Updated user ${userId} online status to ${isOnline} (matched: ${updateResult.matchedCount}, modified: ${updateResult.modifiedCount})`);
    } catch (error) {
      console.error('Error updating user online status:', error);
    }
  };

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join user to their own room for personal notifications
    socket.on('join-user-room', async (userId) => {
      socket.join(`user-${userId}`);
      socket.userId = userId; // Store userId in socket for disconnect handling
      console.log(`User ${userId} joined their room`);

      // Update user online status
      console.log(`Updating user ${userId} to online status`);
      await updateUserOnlineStatus(userId, true);

      // Broadcast user online status to admin
      console.log(`Broadcasting user ${userId} online status`);
      io.emit('user-status-changed', { userId, isOnline: true });
    });

    // Join global feed room
    socket.on('join-feed', () => {
      socket.join('global-feed');
      console.log('User joined global feed');
    });

    // Leave rooms on disconnect
    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);

      // Update user offline status
      if (socket.userId) {
        await updateUserOnlineStatus(socket.userId, false);

        // Broadcast user offline status to admin
        io.emit('user-status-changed', { userId: socket.userId, isOnline: false });
      }
    });
  });

  // Make io accessible globally
  global.io = io;

  // Helper function to emit to all connected clients
  global.emitToAll = (event, data) => {
    io.emit(event, data);
  };

  // Helper function to emit to specific user
  global.emitToUser = (userId, event, data) => {
    io.to(userId).emit(event, data);
  };

  server
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
