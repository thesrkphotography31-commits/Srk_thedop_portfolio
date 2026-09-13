import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Internal diagnostic version identifier (not visible to public users)
if (typeof window !== 'undefined') {
  (window as any).__BUILD_VERSION__ = '2026.09.13.4-canonical';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
