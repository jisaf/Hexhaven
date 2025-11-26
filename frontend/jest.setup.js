// jest.setup.js
Object.defineProperty(global, 'import.meta', {
  value: {
    env: {
      VITE_API_URL: 'http://localhost:3000/api',
      VITE_WS_URL: 'http://localhost:3000',
    },
  },
});
