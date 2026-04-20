import { io } from 'socket.io-client';

export const createDoctorChatSocket = (token) => io('http://localhost:5001', {
  auth: { token },
  transports: ['websocket', 'polling'],
});
