import { Component, inject } from '@angular/core';
import { rxResource, toObservable } from '@angular/core/rxjs-interop';
import { ChatStore } from '../../core/chat.store';
import { generativeRegistry } from '../../core/generative.registry';
import { GenerativeHostDirective } from '../../directives/generative-host.directive';
import type { HistoryItem } from '../../core/chat.types';

/**
 * SIDEBAR (mini-cards de resultados anteriores)
 * ============================================================================
 * Muestra las últimas consultas que devolvió el LLM (clima, crypto, noticias).
 *
 * ¿Por qué rxResource aquí?
 *   El historial vive en el signal store. Con `toObservable(history)` lo
 *   convertimos en un Observable y se lo damos a rxResource. Así el sidebar es
 *   una "resource" reactiva: cada vez que llega un nuevo resultado (evento 'ui'),
 *   el store cambia → el Observable emite → rxResource se actualiza solo.
 *   (rxResource NO sirve para el stream SSE del chat, que es un POST con
 *   múltiples eventos; ahí usamos fetch+ReadableStream.)
 *
 * Estructura de archivos: .html (plantilla) · .scss (estilos) · .ts (lógica)
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [GenerativeHostDirective],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  readonly store = inject(ChatStore);

  // Convertimos el signal de historial en un Observable para rxResource.
  // Se pasa la SEÑAL (no su valor) para que toObservable se reactive a cambios.
  private readonly history$ = toObservable(this.store.history);

  /** Resource reactiva: se actualiza cada vez que cambia el store.history. */
  readonly historyRes = rxResource<HistoryItem[], unknown>({
    stream: () => this.history$,
    // Mantiene el último valor mientras carga (evita parpadeo)
    defaultValue: [],
  });

  // Referencia al registry (para futuras lógicas / debugging en la plantilla)
  readonly registry = generativeRegistry;
}
