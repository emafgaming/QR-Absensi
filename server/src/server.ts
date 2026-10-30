import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';

const PORT = parseInt(process.env.PORT || '5000', 10);

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(` WisudaAttend Server is running!`);
    console.log(` Port: ${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(` REST API: http://localhost:${PORT}/api/v1`);
    console.log(` Health: http://localhost:${PORT}/api/v1/health`);
    console.log(`=========================================`);
  });
}

export default app;
