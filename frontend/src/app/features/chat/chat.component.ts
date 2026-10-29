import { Component, DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChatStore } from '../../core/chat.store';
import { SseService } from '../../core/sse.service';
import { MessageComponent } from './message.component';

/**
 * VISTA PRINCIPAL DEL CHAT
 * ============================================================================
 * Orquesta el flujo:
 *   1. El usuario escribe y envía
 *   2. Se crean 2 mensajes (user + assistant vacío) en el store
 *   3. Se abre el stream SSE (SseService.chat)
 *   4. Cada evento se aplica al mensaje del asistente vía ChatStore.applyEvent
 *   5. Al terminar, se desmarca isStreaming
 *
 * El render es 100% reactivo: al mutar signals del store, Angular repinta solo
 * lo que cambió (token a token sin recalcular toda la lista).
 */
@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [MessageComponent],
  template: `
    <!-- Zona de mensajes (scroll) -->
    <div class="messages" #scrollBox>
      @if (store.messages().length === 0) {
        <div class="hero">
          <div class="hero-icon">◉</div>
          <h2>¿Qué quieres saber en tiempo real?</h2>
          <p>Prueba con:</p>
          <div class="suggestions">
            @for (s of suggestions; track s) {
              <button class="chip" (click)="send(s)">{{ s }}</button>
            }
          </div>
        </div>
      } @else {
        @for (m of store.messages(); track m.id) {
          <app-message [message]="m" />
        }
      }

      @if (store.isStreaming()) {
        <div class="typing">
          <span></span><span></span><span></span>
        </div>
      }
    </div>

    <!-- Barra de entrada -->
    <form class="composer" (submit)="$event.preventDefault(); send()">
      <input
        class="input"
        [value]="draft()"
        (input)="draft.set($any($event.target).value)"
        (keydown.enter)="send()"
        placeholder="Pregunta por el clima, precio de bitcoin o noticias…"
        [disabled]="store.isStreaming()"
        autocomplete="off"
      />
      <button
        class="send"
        type="submit"
        [disabled]="store.isStreaming() || !draft().trim()"
      >
        @if (store.isStreaming()) { … } @else { Enviar }
      </button>
    </form>
  `,
  styles: [
    `
      :host { display: flex; flex-direction: column; height: calc(100vh - 60px); min-width: 0; }
      .messages { flex: 1; overflow-y: auto; padding: 1.5rem; }
      .hero { text-align: center; margin-top: 8vh; color: #94a3b8; }
      .hero-icon { font-size: 3rem; color: var(--accent); }
      .hero h2 { color: var(--text); font-size: 1.3rem; margin: 0.5rem 0; }
      .hero p { margin: 1rem 0 0.5rem; font-size: 0.85rem; }
      .suggestions { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
      .chip {
        background: var(--surface); color: var(--text);
        border: 1px solid #293548; border-radius: 999px;
        padding: 0.4rem 0.9rem; font-size: 0.82rem; cursor: pointer;
        transition: 0.15s;
      }
      .chip:hover { border-color: var(--accent); color: var(--accent); }
      .typing { display: flex; gap: 5px; padding: 0 0 0 40px; }
      .typing span { width: 7px; height: 7px; background: var(--accent); border-radius: 50%; animation: bounce 1.2s infinite; }
      .typing span:nth-child(2) { animation-delay: 0.2s; }
      .typing span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-6px); opacity: 1; } }
      .composer {
        display: flex; gap: 0.6rem; padding: 1rem 1.5rem;
        background: var(--surface); border-top: 1px solid #293548;
      }
      .input {
        flex: 1; background: #0f172a; border: 1px solid #293548;
        border-radius: 10px; padding: 0.75rem 1rem; color: var(--text);
        font-size: 0.95rem; outline: none;
      }
      .input:focus { border-color: var(--accent); }
      .input:disabled { opacity: 0.6; }
      .send {
        background: var(--accent); color: #0f172a; border: none;
        border-radius: 10px; padding: 0 1.3rem; font-weight: 700;
        cursor: pointer; font-size: 0.9rem;
      }
      .send:disabled { opacity: 0.5; cursor: not-allowed; }
    `,
  ],
})
export class ChatComponent {
  readonly store = inject(ChatStore);
  private readonly sse = inject(SseService);
  private readonly destroyRef = inject(DestroyRef);

  /** Texto actual del input (signal, sin FormsModule). */
  readonly draft = signal('');

  /** Mensajes de sugerencia para la pantalla vacía. */
  readonly suggestions = [
    '¿Qué clima hace en Madrid?',
    'Precio de bitcoin',
    'Noticias de tecnología',
  ];

  @ViewChild('scrollBox') private scrollBox!: ElementRef<HTMLDivElement>;

  /**
   * Envía el mensaje actual (o el texto pasado como atajo de las suggestions).
   * Gestiona el ciclo completo del stream.
   */
  send(text?: string): void {
    const content = (text ?? this.draft()).trim();
    if (!content || this.store.isStreaming()) return;

    // Snapshot del historial previo para darle contexto al backend
    const history = this.store.messages().map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Limpiamos el input y agregamos los mensajes al store
    this.draft.set('');
    this.store.addUserMessage(content);
    const assistantId = this.store.addAssistantMessage();
    this.store.setStreaming(true);

    // Abrimos el stream SSE y aplicamos cada evento al mensaje del asistente
    this.sse
      .chat([...history, { role: 'user', content }])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ev) => this.store.applyEvent(assistantId, ev),
        error: (err) => {
          console.error('SSE error:', err);
          this.store.applyEvent(assistantId, {
            type: 'error',
            message: 'No se pudo conectar con el backend.',
          });
          this.store.setStreaming(false);
        },
        complete: () => this.store.setStreaming(false),
      });
  }
}
