import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');

const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT) || 3000;

app.use(express.static(distDir));

// SPA fallback so direct routes (/auth/action, /terms, /privacy, /login, etc.) serve index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
});
