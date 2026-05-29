import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign Vite websocket errors in this environment
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && (
    event.reason.message?.includes('WebSocket') || 
    event.reason === 'WebSocket closed without opened.'
  )) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
