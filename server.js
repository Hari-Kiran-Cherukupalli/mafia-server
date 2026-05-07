const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();

// Health check — keeps Render free tier awake & lets app verify connectivity
app.get('/', (req, res) => res.send('Mafia server is running'));
app.get('/health', (req, res) => res.json({ status: 'ok', rooms: rooms.size }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

const rooms = new Map();

function generateRoomCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(code));
  return code;
}

function assignRoles(players, mafiaCount) {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const roleMap = {};
  let i = 0;
  roleMap[shuffled[i++].id] = 'Organizer';
  roleMap[shuffled[i++].id] = 'Angel';
  roleMap[shuffled[i++].id] = 'Detective';
  for (let m = 0; m < mafiaCount; m++) {
    roleMap[shuffled[i++].id] = 'Mafia';
  }
  while (i < shuffled.length) {
    roleMap[shuffled[i++].id] = 'Villager';
  }
  return roleMap;
}

function sanitizeRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    players: room.players.map((p) => ({ id: p.id, name: p.name })),
    mafiaCount: room.mafiaCount,
    status: room.status,
  };
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('createRoom', ({ playerName }) => {
    const roomCode = generateRoomCode();
    const room = {
      code: roomCode,
      hostId: socket.id,
      players: [{ id: socket.id, name: playerName }],
      mafiaCount: 1,
      status: 'lobby',
    };
    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    // Send room data inline with roomCreated so client has it immediately
    socket.emit('roomCreated', { roomCode, playerId: socket.id, room: sanitizeRoom(room) });
  });

  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('joinError', { message: 'Room not found. Check the code and try again.' });
      return;
    }
    if (room.status !== 'lobby') {
      socket.emit('joinError', { message: 'Game has already started.' });
      return;
    }
    if (room.players.some((p) => p.name.toLowerCase() === playerName.toLowerCase())) {
      socket.emit('joinError', { message: 'That name is already taken in this room.' });
      return;
    }
    room.players.push({ id: socket.id, name: playerName });
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    // Send room data inline with roomJoined so client has it immediately
    socket.emit('roomJoined', { roomCode, playerId: socket.id, room: sanitizeRoom(room) });
    // Notify all OTHER players in the room
    socket.to(roomCode).emit('roomUpdated', sanitizeRoom(room));
  });

  // Fallback: client can request current room state at any time
  socket.on('getRoom', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (room) socket.emit('roomUpdated', sanitizeRoom(room));
  });

  socket.on('setMafiaCount', ({ roomCode, mafiaCount }) => {
    const room = rooms.get(roomCode);
    if (!room || room.hostId !== socket.id) return;
    room.mafiaCount = mafiaCount;
    io.to(roomCode).emit('roomUpdated', sanitizeRoom(room));
  });

  socket.on('startGame', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room || room.hostId !== socket.id) return;

    const minPlayers = { 1: 5, 2: 7, 3: 10 };
    const required = minPlayers[room.mafiaCount];
    if (room.players.length < required) {
      socket.emit('gameError', {
        message: `Need at least ${required} players to start with ${room.mafiaCount} Mafia${room.mafiaCount > 1 ? 's' : ''}.`,
      });
      return;
    }

    const roleMap = assignRoles(room.players, room.mafiaCount);
    room.status = 'playing';
    room.roleMap = roleMap;

    const organizer = room.players.find((p) => roleMap[p.id] === 'Organizer');
    const organizerName = organizer?.name || '';
    const mafiaPlayers = room.players.filter((p) => roleMap[p.id] === 'Mafia');
    const mafiaNames = mafiaPlayers.map((p) => p.name);

    room.players.forEach((player) => {
      const role = roleMap[player.id];
      const payload = {
        role,
        organizerName,
        mafiaNames: role === 'Mafia' ? mafiaNames.filter((n) => n !== player.name) : [],
        allPlayers:
          role === 'Organizer'
            ? room.players.map((p) => ({ name: p.name, role: roleMap[p.id] }))
            : null,
      };
      io.to(player.id).emit('gameStarted', payload);
    });
  });

  socket.on('disconnect', () => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;

    room.players = room.players.filter((p) => p.id !== socket.id);

    if (room.players.length === 0) {
      rooms.delete(roomCode);
      return;
    }
    if (room.hostId === socket.id) {
      room.hostId = room.players[0].id;
      io.to(room.players[0].id).emit('youAreHost');
    }
    if (room.status === 'lobby') {
      io.to(roomCode).emit('roomUpdated', sanitizeRoom(room));
    }
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Mafia server running on port ${PORT}`);
});
