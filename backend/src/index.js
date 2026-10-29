import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { chatStream } from './llm.js';
import { createProvider } from './providers/index.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Creamos el proveedor una vez para informar cuál está activo en /health
const provider = createProvider();

app.use(cors());
app.use(express.json());

// Health check: también dice qué proveedor LLM está configurado
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'genui-liveops-backend', provider: provider.name });
});

/**
 * POST /api/chat
 * ============================================================================
 * Endpoint SSE (Server-Sent Events). El frontend abre este stream y va
 * recibiendo eventos tipo text/event-stream:
 *
 *   event: token        → data: { text }         (texto incremental)
 *   event: tool_call    → data: { id, name, args }
 *   event: tool_result  → data: { id, name, data | error }
 *   event: ui           → data: { component, data }  ← Generative UI
 *   event: done         → data: {}
 *   event: error        → data: { message }
 */
app.post('/api/chat', async (req, res) => {
  // Headers que le dicen al navegador que es un stream persistente
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // desactiva buffering en nginx
  res.flushHeaders();

  // Helper para formatear cada evento SSE
  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Comentario keep-alive: evita que proxies cierren la conexión por inactividad
  const ka = setInterval(() => res.write(': keep-alive\n\n'), 15000);

  try {
    const messages = req.body?.messages ?? [];
    await chatStream(messages, send);
    send('done', {});
  } catch (err) {
    console.error('Error en stream:', err);
    send('error', { message: 'Error interno del stream' });
  } finally {
    clearInterval(ka);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend escuchando en http://localhost:${PORT} (proveedor: ${provider.name})`);
});
