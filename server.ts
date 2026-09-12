import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import api from './server/api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use('/api', api);
app.use(express.static(path.resolve(__dirname, 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`WorkSphere server listening on 0.0.0.0:${port}`);
});
