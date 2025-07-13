import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  if (!io) {
    io = new Server(server, {
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Join user to their own room for personal notifications
      socket.on('join-user-room', (userId) => {
        socket.join(`user-${userId}`);
        console.log(`User ${userId} joined their room`);
      });

      // Join global feed room
      socket.on('join-feed', () => {
        socket.join('global-feed');
        console.log('User joined global feed');
      });

      // Leave rooms on disconnect
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });
  }

  return io;
};

export const getSocket = () => {
  if (global.io) {
    return global.io;
  }
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Helper functions for emitting events
export const emitToUser = (userId, event, data) => {
  const socketInstance = global.io || io;
  if (socketInstance) {
    socketInstance.to(`user-${userId}`).emit(event, data);
  }
};

export const emitToFeed = (event, data) => {
  const socketInstance = global.io || io;
  if (socketInstance) {
    socketInstance.to('global-feed').emit(event, data);
  }
};

export const emitToAll = (event, data) => {
  const socketInstance = global.io || io;
  if (socketInstance) {
    socketInstance.emit(event, data);
  }
};
