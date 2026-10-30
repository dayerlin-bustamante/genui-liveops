import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { ChatStore } from '../../../core/chat.store';
import { MessageComponent } from '../message/message.component';

/**
 * VISTA PRINCIPAL DEL CHAT
 * ============================================================================
 * La lógica del stream vive en el `ChatStore` (NgRx signalStore). Este
 * componente solo maneja el ESTADO DE VISTA (el texto del input) y delega
 * el envío al store con `store.sendMessage(text)`.
 *
 * El flujo completo (crear mensajes → abrir SSE → aplicar eventos →
 * desmarcar streaming) ocurre dentro del store vía `rxMethod`.
 * El render es reactivo: cada token muta el signal y Angular repinta solo
 * lo que cambió.
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
  /** Store con todo el estado y los métodos del chat. */
  readonly store = inject(ChatStore);

  /** Texto actual del input (estado de vista, no de app → se queda aquí). */
  readonly draft = signal('');

  /** Mensajes de sugerencia para la pantalla vacía. */
  readonly suggestions = [
    '¿Qué clima hace en Madrid?',
    'Precio de bitcoin',
    'Noticias de tecnología',
  ];

  @ViewChild('scrollBox') private scrollBox!: ElementRef<HTMLDivElement>;

  /**
   * Envía el mensaje actual (o el texto de las suggestions).
   * Delega todo el ciclo de vida del stream al store.
   */
  send(text?: string): void {
    const content = (text ?? this.draft()).trim();
    if (!content) return;

    this.draft.set('');
    this.store.sendMessage(content); // rxMethod dentro del store
  }
}
