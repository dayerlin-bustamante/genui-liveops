import { createClaudeProvider } from './claude.provider.js';
import { createOpenAIProvider } from './openai.provider.js';
import { createMockProvider } from './mock.provider.js';

/**
 * FACTORY DE PROVEEDORES (Factory Pattern)
 * ============================================================================
 * Elige qué proveedor LLM usar según la variable de entorno LLM_PROVIDER.
 * Así el resto del código (llm.js, index.js) nunca cambia al cambiar de LLM.
 *
 *   LLM_PROVIDER=claude  → usa ANTHROPIC_API_KEY (default)
 *   LLM_PROVIDER=openai  → usa OPENAI_API_KEY
 *   LLM_PROVIDER=mock    → sin key, demo offline
 *
 * Si falta la API key del proveedor elegido, hacemos fallback automático a
 * mock y avisamos por consola (mejor degradar que romper la demo).
 */
export function createProvider(env = process.env) {
  const which = (env.LLM_PROVIDER || 'claude').toLowerCase();

  if (which === 'claude') {
    if (!env.ANTHROPIC_API_KEY) {
      console.warn('⚠️  Falta ANTHROPIC_API_KEY → usando proveedor MOCK.');
      return createMockProvider();
    }
    return createClaudeProvider({
      apiKey: env.ANTHROPIC_API_KEY,
      model: env.LLM_MODEL || 'claude-haiku-4-5',
    });
  }

  if (which === 'openai') {
    if (!env.OPENAI_API_KEY) {
      console.warn('⚠️  Falta OPENAI_API_KEY → usando proveedor MOCK.');
      return createMockProvider();
    }
    return createOpenAIProvider({
      apiKey: env.OPENAI_API_KEY,
      model: env.LLM_MODEL || 'gpt-4o-mini',
    });
  }

  if (which === 'mock') {
    return createMockProvider();
  }

  throw new Error(`LLM_PROVIDER desconocido: "${which}". Usa claude | openai | mock`);
}
