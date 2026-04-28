import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket client connected: ${socket.id}`);

    // Relay live simulation updates to all connected frontends
    socket.on('SIMULATED_SALE', () => {
      io.emit('DASHBOARD_UPDATE');
      io.emit('STATS_UPDATE');
      io.emit('FINANCE_UPDATE');
    });

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    console.warn('Socket.io is not initialized yet!');
  }
  return io;
};