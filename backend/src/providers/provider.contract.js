/**
 * ============================================================================
 * CONTRATO (interfaz) DE TODOS LOS PROVEEDORES LLM
 * ============================================================================
 *
 * Cada proveedor (Claude, OpenAI, Mock) debe implementar el mismo contrato.
 * Esto es el patrón "Strategy": el orquestador (llm.js) NO sabe con qué
 * modelo está hablando, solo llama a `stream()` y consume eventos normalizados.
 *
 * EVENTOS NORMALIZADOS que todo proveedor debe emitir vía el callback `emit`:
 *
 *   { type: 'token',       text: string }                    → texto incremental
 *   { type: 'tool_call',   id, name, args: object }          → el modelo quiere usar una tool
 *   { type: 'done' }                                          → terminó de generar
 *
 * NOTA: los eventos 'tool_result' y 'ui' NO los emite el proveedor, los
 * emite el orquestador (llm.js) al ejecutar la tool. Así el proveedor solo
 * se preocupa por hablar con su API.
 */

/**
 * @typedef {Object} ToolDef
 * @property {string} name          Nombre de la tool (ej: 'get_weather')
 * @property {string} description   Descripción que el LLM lee para decidir cuándo usarla
 * @property {Object} inputSchema   Schema JSON de parámetros (formato OpenAI-compatible)
 * @property {Function} handler     async (args) => data  → ejecuta la tool real
 * @property {string} ui            Nombre del componente generativo a renderizar
 */

/**
 * @typedef {Object} Provider
 * @property {string} name
 * @property {(params: {
 *   messages: Array<{role: 'user'|'assistant', content: string|any}>,
 *   tools: ToolDef[],
 *   system: string,
 *   emit: (event: {type: string, [k: string]: any}) => void
 * }) => Promise<{toolCalls: Array<{id: string, name: string, args: Object}>}>} stream
 *
 *   `stream()` debe:
 *   1. Llamar a la API del LLM en modo streaming
 *   2. Emitir eventos 'token' con el texto incremental
 *   3. Si el modelo decide usar tools, emitir un evento 'tool_call' por cada una
 *   4. Resolver con la lista de toolCalls (vacía si no hubo)
 *   5. NUNCA ejecuta las tools: eso lo hace el orquestador
 */

/**
 * Valida que un proveedor cumpla el contrato mínimo.
 * Falla rápido si falta algo (mejor error en arranque que en producción).
 * @param {any} provider
 * @returns {Provider}
 */
export function assertProvider(provider) {
  if (!provider || typeof provider.name !== 'string' || typeof provider.stream !== 'function') {
    throw new Error(`Proveedor inválido: debe tener { name: string, stream: Function }`);
  }
  return provider;
}
