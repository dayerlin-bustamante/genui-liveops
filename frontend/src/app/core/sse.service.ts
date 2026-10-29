import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface SseEvent {
  event: string;
  data: any;
}

/**
 * Cliente SSE que consume POST /api/chat del backend.
 * Emite eventos: token | tool_call | tool_result | ui | done | error
 */
@Injectable({ providedIn: 'root' })
export class SseService {
  private readonly http = inject(HttpClient);

  // TODO: usar ReadableStream / EventSource-with-POST para consumir el stream.
  chat(_messages: { role: string; content: string }[]) {
    return this.http.post('/api/chat', { messages: _messages });
  }
}
