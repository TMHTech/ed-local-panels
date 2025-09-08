import { io } from 'https://cdn.socket.io/4.7.5/socket.io.esm.min.js';
export const ws = io('http://localhost:8787', { transports: ['websocket'] });
