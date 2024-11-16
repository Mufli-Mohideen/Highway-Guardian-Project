import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRouter from './AppRouter'; // Import the AppRouter
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);

// Measure performance (optional)
reportWebVitals();
