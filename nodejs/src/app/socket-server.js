/**
 * 实时层：在已有 HTTP server 上挂载 Socket.IO
 */

const { Server } = require('socket.io');

function attachSocketIO(httpServer) {
  return new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });
}

module.exports = { attachSocketIO };
