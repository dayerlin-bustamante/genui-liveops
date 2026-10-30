import { Component, input } from '@angular/core';
import { GenerativeHostDirective } from '../../../directives/generative-host.directive';
import type { ChatMessage } from '../../../core/interfaces/chat-message.interface';

/**
 * Componente que renderiza UN mensaje del chat.
 * Muestra:
 *   - el texto (que crece con el streaming de tokens)
 *   - indicadores de tools en curso / terminadas
 *   - las tarjetas generativas embebidas (via GenerativeHostDirective)
 *
 * Estructura de archivos: .html (plantilla) · .scss (estilos) · .ts (lógica)
 */
@Component({
  selector: 'app-message',
  standalone: true,
  imports: [GenerativeHostDirective],
  templateUrl: './message.component.html',
  styleUrl: './message.component.scss',
})
export class MessageComponent {
  /** Mensaje a renderizar (signal input). */
  readonly message = input.required<ChatMessage>();
}
