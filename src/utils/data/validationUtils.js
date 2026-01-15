// data/validationUtils.js

export const ValidationUtils = {
  isAllowedOrigin(origin) {
    const allowedOrigins = [
      'https://claude.ai',
      'https://claude.easychat.top',
      'https://pro.easychat.top',
      'https://chatgpt.com',
      'https://grok.com',
      'https://x.com',
      'https://gemini.google.com',
      'https://aistudio.google.com',
      'http://localhost:3789',
      'https://yalums.github.io'
    ];
    return allowedOrigins.some(allowed => origin === allowed) ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1');
  }
};
