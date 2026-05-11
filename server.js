const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const rooms = new Map(); // defined first so health route can reference it

const app = express();
app.get('/', (req, res) => res.send('Mafia server is running'));
app.get('/health', (req, res) => res.json({ status: 'ok', rooms: rooms.size }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

function generateRoomCode() {
  let code;
  do { code = Math.floor(1000 + Math.random() * 9000).toString(); }
  while (rooms.has(code));
  return code;
}

function assignRoles(players, mafiaCount) {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const roleMap = {};
  let i = 0;
  roleMap[shuffled[i++].id] = 'Organizer';
  roleMap[shuffled[i++].id] = 'Angel';
  roleMap[shuffled[i++].id] = 'Detective';
  for (let m = 0; m < mafiaCount; m++) roleMap[shuffled[i++].id] = 'Mafia';
  while (i < shuffled.length) roleMap[shuffled[i++].id] = 'Villager';
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

function removePlayerFromRoom(room, socketId, io) {
  room.players = room.players.filter((p) => p.id !== socketId);
  if (room.players.length === 0) {
    rooms.delete(room.code);
    return;
  }
  if (room.hostId === socketId) {
    room.hostId = room.players[0].id;
    io.to(room.players[0].id).emit('youAreHost');
  }
  if (room.status === 'lobby') {
    io.to(room.code).emit('roomUpdated', sanitizeRoom(room));
  }
}

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

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
    // Send room inline — avoids race condition where roomUpdated arrives before lobby mounts
    socket.emit('roomCreated', { roomCode, playerId: socket.id, room: sanitizeRoom(room) });
  });

  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const room = rooms.get(roomCode);
    if (!room) { socket.emit('joinError', { message: 'Room not found. Check the code and try again.' }); return; }
    if (room.status !== 'lobby') { socket.emit('joinError', { message: 'Game has already started.' }); return; }
    if (room.players.some((p) => p.name.toLowerCase() === playerName.toLowerCase())) {
      socket.emit('joinError', { message: 'That name is already taken in this room.' }); return;
    }
    // Remove any ghost entry with this socket ID (reconnect case)
    room.players = room.players.filter((p) => p.id !== socket.id);
    room.players.push({ id: socket.id, name: playerName });
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.emit('roomJoined', { roomCode, playerId: socket.id, room: sanitizeRoom(room) });
    socket.to(roomCode).emit('roomUpdated', sanitizeRoom(room));
  });

  // Client requests current room state (fallback on mount)
  socket.on('getRoom', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (room) socket.emit('roomUpdated', sanitizeRoom(room));
    else socket.emit('roomNotFound');
  });

  // Explicit leave (back button / navigating home)
  socket.on('leaveRoom', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    socket.leave(roomCode);
    socket.data.roomCode = null;
    removePlayerFromRoom(room, socket.id, io);
    console.log(`${socket.id} left room ${roomCode}`);
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
      socket.emit('gameError', { message: `Need at least ${required} players to start with ${room.mafiaCount} Mafia${room.mafiaCount > 1 ? 's' : ''}.` });
      return;
    }
    const roleMap = assignRoles(room.players, room.mafiaCount);
    room.status = 'playing';

    // Derive key info
    const organizer = room.players.find((p) => roleMap[p.id] === 'Organizer');
    const organizerName = organizer ? organizer.name : '';
    // Only include actual Mafia player IDs
    const mafiaPlayerIds = Object.entries(roleMap).filter(([, r]) => r === 'Mafia').map(([id]) => id);
    const mafiaNameMap = {};
    mafiaPlayerIds.forEach((id) => {
      const p = room.players.find((pl) => pl.id === id);
      if (p) mafiaNameMap[id] = p.name;
    });
    const allMafiaNames = Object.values(mafiaNameMap);

    // Full list sent to everyone — UI shows it only on cheat code (1-3-2 taps)
    const allPlayersList = room.players.map((p) => ({ name: p.name, role: roleMap[p.id] || 'Unknown' }));

    room.players.forEach((player) => {
      const role = roleMap[player.id];
      const payload = {
        role,
        organizerName,
        mafiaNames: role === 'Mafia' ? allMafiaNames.filter((n) => n !== player.name) : [],
        allPlayers: allPlayersList,
      };
      io.to(player.id).emit('gameStarted', payload);
    });
  });

  socket.on('disconnect', () => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;
    removePlayerFromRoom(room, socket.id, io);
    console.log('Disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => console.log(`Mafia server on port ${PORT}`));
