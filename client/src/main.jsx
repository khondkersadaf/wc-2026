import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-center"
      toastOptions={{
        style: { background: '#1f2937', color: '#f9fafb', border: '1px solid #374151' },
        success: { iconTheme: { primary: '#10b981', secondary: '#030712' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#030712' } },
      }}
    />
  </React.StrictMode>
);
