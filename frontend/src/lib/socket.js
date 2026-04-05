import { io } from 'socket.io-client';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const socketUrl = apiUrl.replace(/\/api\/?$/, ''); 

// Initialize the socket outside of any React component
export const socket = io(socketUrl, {
    autoConnect: true,
    withCredentials: true, // Required if your backend uses cookies
});

socket.on('connect', () => {
    console.log('Connected to Socket.IO Server:', socket.id);
});

socket.on('disconnect', () => {
    console.log('Disconnected from Socket.IO Server');
});