/** Eventos crudos que llegan por el stream SSE del backend. */
export type SseEventType =
  | 'token'
  | 'tool_call'
  | 'tool_result'
  | 'ui'
  | 'done'
  | 'error';
