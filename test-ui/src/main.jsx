import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Import DAPS Design System CSS
import './css/index.css';

/**
 * Main application entry point
 * Using React 19 createRoot API
 */
const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);