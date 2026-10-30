import { Injectable, Injector, computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, filter, finalize, of, switchMap, tap } from 'rxjs';
import { SseService } from './sse.service';
import type { ChatMessage } from './interfaces/chat-message.interface';
import type { ChatState } from './interfaces/chat-state.interface';
import type { GenerativeWidget } from './interfaces/generative-widget.interface';
import type { HistoryItem } from './interfaces/history-item.interface';
import type { SseEvent } from './interfaces/sse-event.interface';
import type { ToolStatus } from './interfaces/tool-status.interface';

/**
 * CHAT STORE — NgRx SignalStore (patrón oficial)
 * ============================================================================
 * Fuente única de verdad del estado. A diferencia de un servicio "a mano"
 * con signals, aquí usamos `signalStore` de @ngrx/signals, que da:
 *
 *   - withState    → estado tipado expuesto como signals (store.messages())
 *   - withComputed → valores derivados reactivos (store.historyCount())
 *   - withMethods  → métodos que mutan el estado con `patchState`
 *   - rxMethod     → métodos REACTIVOS basados en RxJS (el stream SSE)
 *
 * El estado se expone como signals de solo lectura; la ÚNICA forma de mutarlo
 * es vía `patchState` dentro de `withMethods` (cambios inmutables y trazables).
 */

const initialState: ChatState = {
  messages: [],
  isStreaming: false,
  history: [],
};

@Injectable({ providedIn: 'root' })
export class ChatStore extends signalStore(
  // ── 1) Estado ────────────────────────────────────────────────────────────
  withState<ChatState>(initialState),

  // ── 2) Valores derivados (computed) ──────────────────────────────────────
  // Recibimos los signals del estado y devolvemos computeds.
  withComputed(({ messages, history, isStreaming }) => ({
    historyCount: computed(() => history().length),
    canSend: computed(() => !isStreaming()),
    hasMessages: computed(() => messages().length > 0),
  })),

  // ── 3) Métodos de escritura (mutaciones vía patchState) ──────────────────
  withMethods((store) => {
    /** Aplica una transformación inmutable a un mensaje por id. */
    const patchMessage = (
      id: string,
      fn: (m: ChatMessage) => ChatMessage
    ): void => {
      patchState(store, {
        messages: store.messages().map((m) => (m.id === id ? fn(m) : m)),
      });
    };

    /** Agrega una tarjeta generativa a un mensaje. */
    const addWidget = (messageId: string, widget: GenerativeWidget): void =>
      patchMessage(messageId, (m) => ({ ...m, widgets: [...m.widgets, widget] }));

    /** Agrega el ítem al historial (mini-cards del sidebar), lo más reciente primero. */
    const pushHistory = (component: string, data: any): void => {
      const item: HistoryItem = {
        id: uid(),
        component,
        title: historyTitle(component, data),
        subtitle: historySubtitle(component, data),
        data,
      };
      patchState(store, { history: [item, ...store.history()].slice(0, 20) });
    };

    return {
      setStreaming: (v: boolean): void => patchState(store, { isStreaming: v }),

      addUserMessage: (content: string): string => {
        const msg: ChatMessage = {
          id: uid(),
          role: 'user',
          content,
          widgets: [],
          tools: [],
        };
        patchState(store, { messages: [...store.messages(), msg] });
        return msg.id;
      },

      addAssistantMessage: (): string => {
        const msg: ChatMessage = {
          id: uid(),
          role: 'assistant',
          content: '',
          widgets: [],
          tools: [],
        };
        patchState(store, { messages: [...store.messages(), msg] });
        return msg.id;
      },

      /**
       * Aplica un evento SSE al mensaje del asistente indicado.
       * Es el corazón de la reactividad del streaming: cada evento muta el
       * estado de forma inmutable y Angular repinta solo lo necesario.
       */
      applyEvent: (messageId: string, ev: SseEvent): void => {
        switch (ev.type) {
          // Texto incremental → concatenamos al contenido del mensaje
          case 'token':
            patchMessage(messageId, (m) => ({
              ...m,
              content: m.content + (ev.text ?? ''),
            }));
            break;

          // El modelo decidió usar una tool → indicador en estado "running"
          case 'tool_call':
            patchMessage(messageId, (m) => ({
              ...m,
              tools: [...m.tools, { name: ev.name ?? 'tool', state: 'running' } as ToolStatus],
            }));
            break;

          // Tool terminada (ok o error) → actualizamos su estado
          case 'tool_result':
            patchMessage(messageId, (m) => ({
              ...m,
              tools: m.tools.map((t) =>
                t.name === ev.name && t.state === 'running'
                  ? { ...t, state: ev.error ? 'error' : 'done', error: ev.error }
                  : t
              ),
            }));
            break;

          // El backend nos dice qué componente generativo renderizar.
          // Lo agregamos al mensaje Y al historial del sidebar.
          case 'ui':
            addWidget(messageId, { component: ev.component!, data: ev.data });
            pushHistory(ev.component!, ev.data);
            break;

          // Error del stream → lo mostramos como texto del asistente
          case 'error':
            patchMessage(messageId, (m) => ({
              ...m,
              content: m.content || (ev.message ?? 'Error desconocido'),
            }));
            break;
        }
      },
    };
  }),

  // ── 4) Método reactivo: el ciclo completo del stream SSE ────────────────
  // rxMethod nos da un método que consume un Observable. Aquí orquestamos:
  // guardar mensaje → abrir stream → aplicar eventos → finalizar.
  // `switchMap` cancela el stream anterior si llega otro mensaje.
  withMethods((store) => {
    // `inject()` funciona aquí porque los features corren en el constructor de
    // la store (con inyector actual). Obtenemos el Injector para pasárselo a
    // rxMethod de forma explícita.
    const injector = inject(Injector);
    const sse = inject(SseService);

    return {
      sendMessage: rxMethod<string>(
        (text$) =>
          text$.pipe(
          // Solo procesamos texto no vacío y si no hay un stream en curso
          filter((text) => !!text.trim() && !store.isStreaming()),
          switchMap((text) => {
            // Snapshot del historial previo para dar contexto al backend
            const history = store.messages().map((m) => ({
              role: m.role,
              content: m.content,
            }));

            // Creamos los mensajes en el store y marcamos streaming
            store.addUserMessage(text);
            const assistantId = store.addAssistantMessage();
            store.setStreaming(true);

            return sse.chat([...history, { role: 'user', content: text }]).pipe(
              tap({
                next: (ev) => store.applyEvent(assistantId, ev),
                error: () =>
                  store.applyEvent(assistantId, {
                    type: 'error',
                    message: 'No se pudo conectar con el backend.',
                  }),
              }),
              // Swallow del error para no romper el stream de rxMethod
              catchError(() => of(null)),
              // Siempre desmarcamos streaming al terminar (done, error o cancel)
              finalize(() => store.setStreaming(false))
            );
          })
        ),
        { injector }
      ),
    };
  })
) {}

// ── Helpers puros (fuera de la store: lógica de presentación) ───────────────

/** Genera un id corto y único para mensajes/ítems. */
function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Deriva el título de la mini-card según el tipo de widget. */
function historyTitle(component: string, data: any): string {
  switch (component) {
    case 'weather-card':
      return String(data?.city ?? 'Clima');
    case 'crypto-card':
      return capitalize(String(data?.coin ?? 'Crypto'));
    case 'news-list':
      return 'Noticias HN';
    default:
      return component;
  }
}

/** Deriva el subtítulo (dato principal) de la mini-card. */
function historySubtitle(component: string, data: any): string {
  switch (component) {
    case 'weather-card':
      return `${data?.temperature ?? '–'}° ${data?.condition ?? ''}`;
    case 'crypto-card':
      return `$${formatNumber(data?.priceUsd)} (${data?.change24h ?? 0}%)`;
    case 'news-list':
      return `${data?.items?.length ?? 0} titulares`;
    default:
      return '';
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatNumber(n: unknown): string {
  return typeof n === 'number' ? n.toLocaleString('es-CO') : String(n ?? '–');
}
