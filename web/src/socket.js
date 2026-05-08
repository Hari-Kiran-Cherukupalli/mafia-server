import { io } from 'socket.io-client';

const SERVER_URL = 'https://mafia-game-server-kjot.onrender.com';

const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 2000,
  timeout: 20000,
});

export default socket;
