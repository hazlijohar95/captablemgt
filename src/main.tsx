import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { SecurityService } from './services/securityService';
import { logger } from './services/loggingService';
import './index.css';

// Initialize security service
SecurityService.initialize();

// Log application startup
logger.info('Cap table management platform starting', {
  environment: import.meta.env.MODE,
  version: '1.0.0'
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);