import { Injectable, computed, signal } from '@angular/core';
import type {
  ChatMessage,
  GenerativeWidget,
  HistoryItem,
  SseEvent,
} from './chat.types';

/**
 * CHAT STORE (patrón Signal Store)
 * ============================================================================
 * Fuente única de verdad del estado de la app. Todo reactivamente con Signals
 * de Angular (sin NgRx/Redux): más simple y moderno.
 *
 * Estado:
 *   - messages  : los mensajes del chat (el asistente va creciendo con tokens)
 *   - isStreaming : true mientras el backend nos manda eventos
 *   - history   : resultados de tools para las mini-cards del sidebar
 *
 * ¿Por qué un store centralizado?
 * Porque el sidebar, el chat y el header necesitan leer el MISMO estado.
 * Con signals, cuando el store cambia, todas las vistas que lo leen se
 * actualizan solas (reactividad automática).
 */
@Injectable({ providedIn: 'root' })
export class ChatStore {
  // ── Estado privado (solo el store lo muta) ──────────────────────────────
  private readonly _messages = signal<ChatMessage[]>([]);
  private readonly _isStreaming = signal(false);
  private readonly _history = signal<HistoryItem[]>([]);

  // ── Vistas públicas (read-only) ─────────────────────────────────────────
  readonly messages = this._messages.asReadonly();
  readonly isStreaming = this._isStreaming.asReadonly();
  readonly history = this._history.asReadonly();

  // Computed: ¿hay algo para mostrar? lo usa la UI para habilitar/deshabilitar
  readonly canSend = computed(() => !this._isStreaming());

  // Computed: contador de consultas del historial (para el header/sidebar)
  readonly historyCount = computed(() => this._history().length);

  /** Marca/desmarca que hay un stream en curso. */
  setStreaming(v: boolean): void {
    this._isStreaming.set(v);
  }

  /** Agrega un mensaje de usuario y devuelve su id. */
  addUserMessage(content: string): string {
    const msg: ChatMessage = {
      id: uid(),
      role: 'user',
      content,
      widgets: [],
      tools: [],
    };
    this._messages.update((ms) => [...ms, msg]);
    return msg.id;
  }

  /** Crea un mensaje del asistente vacío (irá llenándose con tokens). */
  addAssistantMessage(): string {
    const msg: ChatMessage = {
      id: uid(),
      role: 'assistant',
      content: '',
      widgets: [],
      tools: [],
    };
    this._messages.update((ms) => [...ms, msg]);
    return msg.id;
  }

  /**
   * Aplica un evento SSE al mensaje del asistente indicado.
   * Es el corazón de la reactividad del streaming: cada evento muta el signal
   * de forma inmutable, y Angular repinta solo lo necesario.
   */
  applyEvent(messageId: string, ev: SseEvent): void {
    switch (ev.type) {
      // Texto incremental → concatenamos al contenido del mensaje
      case 'token':
        this.patchMessage(messageId, (m) => ({
          ...m,
          content: m.content + (ev.text ?? ''),
        }));
        break;

      // El modelo decidió usar una tool → agregamos indicador "running"
      case 'tool_call':
        this.patchMessage(messageId, (m) => ({
          ...m,
          tools: [...m.tools, { name: ev.name ?? 'tool', state: 'running' }],
        }));
        break;

      // Tool terminada (ok o error) → actualizamos su estado
      case 'tool_result':
        this.patchMessage(messageId, (m) => ({
          ...m,
          tools: m.tools.map((t) =>
            t.name === ev.name && t.state === 'running'
              ? { ...t, state: ev.error ? 'error' : 'done', error: ev.error }
              : t
          ),
        }));
        break;

      // Evento 'ui' → el backend nos dice qué componente generativo renderizar.
      // Lo agregamos al mensaje Y también al historial (para el sidebar).
      case 'ui':
        this.addWidget(messageId, ev.component!, ev.data);
        this.pushHistory(ev.component!, ev.data);
        break;
    }
  }

  /** Agrega una tarjeta generativa a un mensaje. */
  private addWidget(messageId: string, component: string, data: any): void {
    this.patchMessage(messageId, (m) => ({
      ...m,
      widgets: [...m.widgets, { component, data }],
    }));
  }

  /** Helper inmutable: aplica un transform a un mensaje por id. */
  private patchMessage(
    id: string,
    fn: (m: ChatMessage) => ChatMessage
  ): void {
    this._messages.update((ms) =>
      ms.map((m) => (m.id === id ? fn(m) : m))
    );
  }

  /**
   * Agrega un ítem al historial del sidebar.
   * Deriva el título/subtítulo del widget para que la mini-card sea legible.
   */
  private pushHistory(component: string, data: any): void {
    const item: HistoryItem = {
      id: uid(),
      component,
      title: historyTitle(component, data),
      subtitle: historySubtitle(component, data),
      data,
    };
    // Lo ponemos al inicio (lo más reciente arriba) y limitamos a 20
    this._history.update((h) => [item, ...h].slice(0, 20));
  }
}

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
