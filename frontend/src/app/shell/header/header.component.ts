import { Component, inject, input } from '@angular/core';
import { ChatStore } from '../../core/chat.store';

/**
 * HEADER de la app.
 * Muestra el título y el estado en vivo (si hay un stream corriendo).
 * Usa signal inputs (input()) + el signal store.
 *
 * Estructura de archivos: .html (plantilla) · .scss (estilos) · .ts (lógica)
 */
@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  /** Estado global (para el indicador "transmitiendo…"). */
  readonly store = inject(ChatStore);

  /** Nombre del proveedor LLM activo (input señal, llega del padre). */
  readonly provider = input<string>('mock');
}
