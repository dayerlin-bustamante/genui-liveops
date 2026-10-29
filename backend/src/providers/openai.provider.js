import OpenAI from 'openai';
import { assertProvider } from './provider.contract.js';

/**
 * PROVEEDOR: OPENAI — misma interfaz que Claude, distinta implementación.
 * Permite alternar de LLM cambiando solo la variable LLM_PROVIDER en .env.
 *
 * Diferencia con Claude: OpenAI emite los tool_calls acumulados al final del
 * stream, en deltas con `index`. Acumulamos por índice igual que con Claude.
 */
export function createOpenAIProvider({ apiKey, model = 'gpt-4o-mini' }) {
  const client = new OpenAI({ apiKey });

  return assertProvider({
    name: 'openai',

    async stream({ messages, tools, system, emit }) {
      // OpenAI usa el formato nativo de function calling; nuestro inputSchema
      // ya viene en ese formato, así que va directo.
      const openaiTools = tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema,
        },
      }));

      const toolCalls = [];
      // Mapa { index → { id, name, args } } para argumentos parciales
      const pending = new Map();

      // message.content nulo + system como primer mensaje
      const stream = await client.chat.completions.create({
        model,
        stream: true,
        messages: [{ role: 'system', content: system }, ...messages],
        tools: openaiTools,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;

        // Texto incremental
        if (delta.content) {
          emit({ type: 'token', text: delta.content });
        }

        // Argumentos de tools llegan en fragmentos por índice
        for (const tc of delta.tool_calls ?? []) {
          const entry = pending.get(tc.index) ?? { id: tc.id, name: '', args: '' };
          if (tc.id) entry.id = tc.id;
          if (tc.function?.name) entry.name += tc.function.name;
          if (tc.function?.arguments) entry.args += tc.function.arguments;
          pending.set(tc.index, entry);
        }
      }

      // Stream cerrado → convertimos cada tool acumulada en un tool_call
      for (const [, entry] of pending) {
        const args = entry.args ? JSON.parse(entry.args) : {};
        toolCalls.push({ id: entry.id, name: entry.name, args });
        emit({ type: 'tool_call', id: entry.id, name: entry.name, args });
      }

      emit({ type: 'done' });
      return { toolCalls };
    },
  });
}
