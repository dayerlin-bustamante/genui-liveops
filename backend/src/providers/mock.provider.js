/**
 * PROVEEDOR: MOCK (demo offline) — no requiere NINGUNA API key.
 *
 * ¿Para qué sirve? Para que el proyecto sea demo-able sin costes y sin
 * configuración: quien cloné el repo pueda ver el streaming SSE y la
 * Generative UI funcionando de inmediato. Simula al LLM detectando palabras
 * clave en el mensaje del usuario y "decidiendo" usar tools.
 *
 * Emite los MISMO eventos normalizados que Claude/OpenAI, así el frontend
 * no nota la diferencia.
 */

// Pequeño delay para simular que el "modelo" tarda en responder (streaming real)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createMockProvider() {
  return {
    name: 'mock',

    async stream({ messages, tools, emit }) {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      const text = String(lastUser?.content ?? '').toLowerCase();

      // Si el historial ya contiene resultados de tools, significa que ya
      // consultamos los datos: en este turno respondemos con el resumen final
      // (sin volver a invocar la tool, para no entrar en bucle).
      const alreadyFetched = messages.some(
        (m) => m.role === 'user' && String(m.content).startsWith('Resultado de')
      );

      // "Decidimos" qué tool usar basado en palabras clave del usuario.
      // Es la misma lógica que un LLM real haría con tool_choice: auto.
      const wanted = alreadyFetched ? undefined : tools.find((t) => {
        if (t.name === 'get_weather') return /clima|weather|tiempo|temperatura/.test(text);
        if (t.name === 'get_crypto') return /crypto|bitcoin|btc|precio|ethereum|eth/.test(text);
        if (t.name === 'get_news') return /noticias|news|titulares|hacker/.test(text);
        return false;
      });

      // Frase introductoria simulada, emitida token a token
      const intro = alreadyFetched
        ? `Aquí tienes los datos más recientes que encontré. ¿Quieres que consulte algo más?`
        : wanted
        ? `Voy a consultar la información más actualizada para ti…`
        : `¡Hola! Puedo decirte el clima, precios de cripto o las noticias de tech.¡Pregúntame algo!`;

      for (const chunk of intro.split(/(?<=\s)/)) {
        emit({ type: 'token', text: chunk });
        await sleep(45); // pequeño retardo → se ve el streaming en el frontend
      }

      const toolCalls = [];
      if (wanted) {
        // Simulamos el tool_call que el "modelo" habría decidido
        const args = mockArgsFor(wanted.name, text);
        emit({ type: 'tool_call', id: `mock_${Date.now()}`, name: wanted.name, args });
        toolCalls.push({ id: `mock_${Date.now()}`, name: wanted.name, args });
      }

      emit({ type: 'done' });
      return { toolCalls };
    },
  };
}

// Genera argumentos plausibles según la tool, para que la demo se vea real
function mockArgsFor(name, text) {
  if (name === 'get_weather') {
    const city = text.match(/(?:en|de|for|of)\s+([a-záéíóúñ\s]+?)(?:[?.,!]|$)/i)?.[1]?.trim() || 'Bogotá';
    return { city: city.charAt(0).toUpperCase() + city.slice(1) };
  }
  if (name === 'get_crypto') {
    return { coin: /eth|ethereum/.test(text) ? 'ethereum' : 'bitcoin' };
  }
  if (name === 'get_news') {
    return { limit: 5 };
  }
  return {};
}
