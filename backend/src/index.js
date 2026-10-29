import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { chatStream } from './llm.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'genui-liveops-backend' });
});

/**
 * POST /api/chat
 * Recibe { messages } y responde en streaming SSE con eventos:
 *  - token     → texto incremental del modelo
 *  - tool_call → el modelo decidió invocar una tool (nombre + args)
 *  - tool_result → resultado de la API consultada
 *  - ui        → instrucción de componente generativo a renderizar
 *  - done      → fin del stream
 */
app.post('/api/chat', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await chatStream(req.body?.messages ?? [], send);
    send('done', {});
  } catch (err) {
    console.error(err);
    send('error', { message: 'Stream error' });
  } finally {
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
