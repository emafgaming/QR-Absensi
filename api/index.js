import app from '../server/dist/app.js';

export default function handler(req, res) {
  const vercelPath = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'];
  if (vercelPath && req.url === '/api') {
    req.url = vercelPath;
  }
  return app(req, res);
}
