import React from 'react';
import ReactDOM from 'react-dom/client';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import App from './App'; // Original app (requires Supabase)
import DemoApp from './DemoApp'; // Demo app with mock data
// import { SecurityService } from './services/securityService';
// import { logger } from './services/loggingService';
import './index.css';

// Using Demo App for local testing without Supabase

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DemoApp />
  </React.StrictMode>
);