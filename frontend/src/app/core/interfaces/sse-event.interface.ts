import type { SseEventType } from '../types/sse-event-type.type';

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
