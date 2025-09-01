// Simple, bulletproof logger implementation to avoid export conflicts
const simpleLogger = {
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(message, data || '');
    }
  },
  
  info: (message: string, data?: any) => {
    console.info(message, data || '');
  },
  
  warn: (message: string, data?: any) => {
    console.warn(message, data || '');
  },
  
  error: (message: string, error?: Error | any, data?: any) => {
    console.error(message, error || '', data || '');
  }
};

export { simpleLogger as logger };
export default simpleLogger;