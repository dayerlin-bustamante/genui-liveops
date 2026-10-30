import type { GenerativeWidget } from './generative-widget.interface';
import type { ToolStatus } from './tool-status.interface';

/** Mensaje del chat (rol user/assistant) con sus widgets generativos. */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;        // texto (crece con el streaming)
  widgets: GenerativeWidget[]; // tarjetas generativas embebidas
  tools: ToolStatus[];    // indicadores de tools invocadas
}
