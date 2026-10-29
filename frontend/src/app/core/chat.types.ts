/**
 * Tipos compartidos de todo el frontend.
 * Mantenerlos en un solo archivo evita duplicados y facilita el tipado estricto.
 */

/** Eventos crudos que llegan por el stream SSE del backend. */
export type SseEventType =
  | 'token'
  | 'tool_call'
  | 'tool_result'
  | 'ui'
  | 'done'
  | 'error';

/** Payload de cada evento SSE (espejo del backend). */
export interface SseEvent {
  type: SseEventType;
  text?: string;
  id?: string;
  name?: string;
  args?: Record<string, unknown>;
  data?: any;
  error?: string;
  component?: string; // nombre del componente generativo (evento 'ui')
  message?: string;
}

/** Un "widget" generativo: componente a renderizar + sus datos. */
export interface GenerativeWidget {
  component: string; // ej: 'weather-card'
  data: any;
}

/** Estado de una herramienta en curso (para mostrar "consultando…"). */
export interface ToolStatus {
  name: string;
  state: 'running' | 'done' | 'error';
  error?: string;
}

/** Mensaje del chat (rol user/assistant) con sus widgets generativos. */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;        // texto (crece con el streaming)
  widgets: GenerativeWidget[]; // tarjetas generativas embebidas
  tools: ToolStatus[];    // indicadores de tools invocadas
}

/** Ítem del historial (mini-cards del sidebar). */
export interface HistoryItem {
  id: string;
  component: string;
  title: string;   // texto corto para la mini-card (ej: 'Bitcoin')
  subtitle: string; // dato principal (ej: '$80,792')
  data: any;
}
