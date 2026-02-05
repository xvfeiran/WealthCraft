const getTimestamp = (): string => {
  return new Date().toISOString();
};

export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[${getTimestamp()}] INFO: ${message}`, data ? JSON.stringify(data) : '');
  },

  error: (message: string, error?: any) => {
    console.error(`[${getTimestamp()}] ERROR: ${message}`, error || '');
  },

  warn: (message: string, data?: any) => {
    console.warn(`[${getTimestamp()}] WARN: ${message}`, data ? JSON.stringify(data) : '');
  },

  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${getTimestamp()}] DEBUG: ${message}`, data ? JSON.stringify(data) : '');
    }
  },
};
