import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign Vite websocket errors in this environment
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && (
    event.reason?.message?.includes('WebSocket') ||
    event.reason?.message?.includes('websocket') ||
    typeof event.reason === 'string' && event.reason.toLowerCase().includes('websocket') ||
    event.reason === 'WebSocket closed without opened.' ||
    String(event.reason).includes('WebSocket')
  )) {
    event.preventDefault();
  }
});

const originalConsoleError = console.error;
console.error = (...args) => {
  const msg = args.join(' ');
  if (typeof msg === 'string' && msg.toLowerCase().includes('websocket')) {
    return; // Suppress websocket errors
  }
  originalConsoleError(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
