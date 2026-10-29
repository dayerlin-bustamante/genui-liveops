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
 *
 * Estructura de archivos: .html (plantilla) · .scss (estilos) · .ts (lógica)
 */
@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [MessageComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
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
