import { createProvider } from './providers/index.js';
import { tools } from './tools.js';

/**
 * ============================================================================
 * ORQUESTADOR (el corazón del backend)
 * ============================================================================
 * Responsabilidades:
 *   1. Hablar con el proveedor LLM (Claude / OpenAI / Mock) vía su `stream()`
 *   2. Ejecutar las tools cuando el modelo las pide (el proveedor NO lo hace)
 *   3. Emitir eventos normalizados al cliente SSE, incluyendo:
 *        - token       : texto incremental
 *        - tool_call   : el modelo decidió usar una tool
 *        - tool_result : resultado REAL de la API consultada
 *        - ui          : instrucción para que el frontend renderice un
 *                        componente generativo (tool.ui + datos)
 *   4. BUCLE multi-turno de tools: tras ejecutar las tools, se le devuelven
 *      los resultados al modelo para que genere la respuesta final
 *      (hasta MAX_TOOL_ROUNDS por seguridad).
 */

const SYSTEM_PROMPT = `Eres el asistente de LiveOps Dashboard, un panel en tiempo real.
Cuando el usuario pregunte por clima, precios de cripto o noticias de tecnología,
usa la herramienta adecuada para obtener datos ACTUALES y luego resume el resultado
de forma breve y útil en español.`;

const MAX_TOOL_ROUNDS = 3; // evita bucles infinitos de tool calling

// Instancia única del proveedor (se elige en el arranque según .env)
const provider = createProvider();

/**
 * Procesa un mensaje del usuario y emite eventos SSE vía `send`.
 * @param {Array<{role: string, content: string}>} messages - historial del chat
 * @param {(event: string, data: any) => void} send - función para emitir SSE
 */
export async function chatStream(messages, send) {
  // Historial de conversación que le pasamos al modelo. Arrancamos con lo que
  // llegó del cliente (rol user).
  const convo = messages.map((m) => ({ role: m.role, content: m.content }));

  // Bucle de tool calling: el modelo puede pedir varias tools en rondas.
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // Pedimos al proveedor que genere un stream. Devuelve las toolCalls que
    // el modelo decidió invocar (vacío si solo respondió texto).
    const { toolCalls } = await provider.stream({
      messages: convo,
      tools,
      system: SYSTEM_PROMPT,
      emit: (ev) => {
        // Reenviamos cada evento normalizado al cliente SSE
        if (ev.type === 'token') send('token', { text: ev.text });
        else if (ev.type === 'tool_call') send('tool_call', { id: ev.id, name: ev.name, args: ev.args });
        else if (ev.type === 'done') return; // lo maneja el bucle
      },
    });

    // Sin tools → el modelo respondió solo con texto, terminamos.
    if (!toolCalls.length) return;

    // Ejecutamos cada tool REALMENTE y emitimos sus resultados al cliente.
    for (const call of toolCalls) {
      const tool = tools.find((t) => t.name === call.name);
      if (!tool) {
        send('tool_result', { id: call.id, name: call.name, error: 'Tool desconocida' });
        continue;
      }
      let result, error;
      try {
        result = await tool.handler(call.args);
      } catch (e) {
        error = e.message; // la tool falló (red, ciudad inexistente, etc.)
      }

      if (error) {
        send('tool_result', { id: call.id, name: call.name, error });
      } else {
        // Evento 'ui': le decimos al FRONTEND qué componente generativo
        // renderizar con qué datos. ¡Esto es la Generative UI!
        send('tool_result', { id: call.id, name: call.name, data: result });
        send('ui', { component: tool.ui, data: result });
      }

      // Registramos la tool y su resultado en el historial para que el modelo
      // pueda redactar la respuesta final con esos datos.
      convo.push({
        role: 'assistant',
        content: `Quiero usar la tool ${call.name} con args ${JSON.stringify(call.args)}`,
      });
      convo.push({
        role: 'user',
        content: error
          ? `La tool ${call.name} falló: ${error}`
          : `Resultado de ${call.name}: ${JSON.stringify(result)}`,
      });
    }
    // Siguiente ronda: ahora el modelo verá los resultados y responderá.
  }
}
