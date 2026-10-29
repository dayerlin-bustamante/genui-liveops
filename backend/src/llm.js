// Orquesta el LLM con tool calling y emite eventos SSE vía `send`.
// TODO: integrar con la API de OpenAI (streaming + tools).
export async function chatStream(messages, send) {
  // Placeholder: en el próximo paso se conecta el cliente OpenAI,
  // se registran las tools (weather, crypto, news...) y se emiten
  // eventos 'token', 'tool_call', 'tool_result' y 'ui'.
  send('token', { text: 'Conecta tu OPENAI_API_KEY para habilitar el stream.' });
}
