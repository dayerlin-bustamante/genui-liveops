import Anthropic from '@anthropic-ai/sdk';
import { assertProvider } from './provider.contract.js';

/**
 * PROVEEDOR: CLAUDE (Anthropic) — elegido como default por su consistencia
 * en tool calling estructurado y su streaming fluido.
 *
 * Flujo interno:
 *   1. Abre un stream con `client.messages.stream(...)`
 *   2. En cada bloque de texto parcial → emite { type: 'token' }
 *   3. Cuando Claude decide invocar tools → emite { type: 'tool_call' }
 *   4. Devuelve los toolCalls al orquestador para que los ejecute
 *
 * Nota: Claude emite los argumentos de una tool como JSON incremental
 * (eventos input_json_delta). Debemos acumularlos por "content_block_index"
 * y parsearlos recién cuando el bloque termina (contentBlockStop).
 */
export function createClaudeProvider({ apiKey, model = 'claude-haiku-4-5' }) {
  const client = new Anthropic({ apiKey });

  return assertProvider({
    name: 'claude',

    async stream({ messages, tools, system, emit }) {
      // Traducimos el schema genérico (formato OpenAI) de tools.js
      // al formato propio de Claude (input_schema).
      const claudeTools = tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema,
      }));

      const toolCalls = [];
      // Mapa { contentBlockIndex → { name, json } } para ir acumulando
      // los argumentos parciales de cada tool_use en curso.
      const pendingBlocks = new Map();

      const stream = client.messages.stream({
        model,
        max_tokens: 1024,
        system,
        tools: claudeTools,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });

      // Texto incremental → el frontend lo va pintando token a token
      stream.on('text', (delta) => {
        emit({ type: 'token', text: delta });
      });

      // Inicio de un bloque (texto o tool_use). Si es tool_use, lo registramos.
      stream.on('contentBlockStart', ({ content_block, content_block_index }) => {
        if (content_block?.type === 'tool_use') {
          pendingBlocks.set(content_block_index, {
            id: content_block.id,
            name: content_block.name,
            json: '',
          });
        }
      });

      // Delta de argumentos JSON de una tool → acumulamos el string parcial
      stream.on('contentBlockDelta', ({ delta, content_block_index }) => {
        if (delta?.type === 'input_json_delta') {
          const block = pendingBlocks.get(content_block_index);
          if (block) block.json += delta.partial_json;
        }
      });

      // Bloque cerrado → si era una tool, parseamos y emitimos el tool_call
      stream.on('contentBlockStop', ({ content_block_index }) => {
        const block = pendingBlocks.get(content_block_index);
        if (!block) return;
        // JSON.parse solo si hay contenido; args vacíos → objeto vacío
        const args = block.json ? JSON.parse(block.json) : {};
        toolCalls.push({ id: block.id, name: block.name, args });
        emit({ type: 'tool_call', id: block.id, name: block.name, args });
        pendingBlocks.delete(content_block_index);
      });

      await stream.finalMessage();

      emit({ type: 'done' });
      return { toolCalls };
    },
  });
}
