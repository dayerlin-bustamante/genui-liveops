import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { SseEvent } from './interfaces/sse-event.interface';

/**
 * SERVICIO SSE (Server-Sent Events sobre POST)
 * ============================================================================
 * ¿Por qué fetch + ReadableStream y no EventSource?
 *   El EventSource NATIVO del navegador solo acepta GET. Nuestro endpoint
 *   /api/chat es POST (para enviar el historial del chat en el cuerpo).
 *   Por eso consumimos el stream con fetch() y leemos el body como
 *   ReadableStream, parseando el protocolo SSE ("event:" / "data:") a mano.
 *
 * ¿Y rxResource?
 *   rxResource sirve para peticiones que resuelven UN valor. Un stream SSE
 *   emite MUCHOS eventos durante varios segundos, así que no aplica aquí.
 *   (rxResource sí lo usamos en el sidebar para el historial.)
 */
@Injectable({ providedIn: 'root' })
export class SseService {
  private readonly http = inject(HttpClient);
  // En dev usamos un proxy de ng serve (ver proxy.conf.json) para evitar CORS.
  // En producción, nginx sirve el frontend y proxya /api → backend.
  private readonly baseUrl = '/api';

  /**
   * Envía mensajes al backend y devuelve un Observable de eventos SSE.
   * El Observable emite un SseEvent por cada evento del stream y se completa
   * cuando el backend envía 'done' (o si ocurre un error).
   */
  chat(messages: { role: string; content: string }[]): Observable<SseEvent> {
    return new Observable<SseEvent>((subscriber) => {
      // AbortController para poder cancelar el stream (ej: al destruir la vista)
      const controller = new AbortController();

      (async () => {
        try {
          const res = await fetch(`${this.baseUrl}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages }),
            signal: controller.signal,
          });

          if (!res.ok || !res.body) {
            throw new Error(`HTTP ${res.status}`);
          }

          // Leemos el body como stream de bytes
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = ''; // acumulamos el texto parcial entre chunks

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decodificamos el chunk y lo agregamos al buffer
            buffer += decoder.decode(value, { stream: true });

            // El protocolo SSE separa eventos con una línea en blanco ("\n\n")
            let sep: number;
            while ((sep = buffer.indexOf('\n\n')) !== -1) {
              const rawEvent = buffer.slice(0, sep);
              buffer = buffer.slice(sep + 2);

              const parsed = parseSseEvent(rawEvent);
              if (!parsed) continue;

              subscriber.next(parsed);

              // 'done' → completamos el Observable
              if (parsed.type === 'done') {
                subscriber.complete();
                return;
              }
            }
          }
          // Si el stream terminó sin 'done', también completamos
          subscriber.complete();
        } catch (err: any) {
          // Si la petición fue cancelada, no emitimos error (es esperado)
          if (err?.name === 'AbortError') {
            subscriber.complete();
          } else {
            subscriber.error(err);
          }
        }
      })();

      // Devolvemos la función de teardown: cancela el stream si se descarta
      return () => controller.abort();
    });
  }
}

/**
 * Parsea un bloque crudo de evento SSE del backend.
 * Ejemplo de bloque:
 *   event: token
 *   data: {"text":"Hola "}
 *
 * Devuelve un SseEvent tipado, o null si el bloque no es válido.
 */
function parseSseEvent(raw: string): SseEvent | null {
  let eventType = '';
  let dataLine = '';

  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) eventType = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLine += line.slice(5).trim();
  }

  if (!eventType || !dataLine) return null;

  try {
    const data = JSON.parse(dataLine);
    return { type: eventType as SseEvent['type'], ...data };
  } catch {
    return null;
  }
}
