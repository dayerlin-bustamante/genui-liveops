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
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [GenerativeHostDirective],
  template: `
    <aside class="sidebar">
      <div class="sidebar-head">
        <h2>Recientes</h2>
        <span class="sidebar-count">{{ store.historyCount() }}</span>
      </div>

      @if (historyRes.isLoading()) {
        <div class="sidebar-empty">Cargando…</div>
      } @else {
        @let items = historyRes.value();

        @if (!items || items.length === 0) {
          <div class="sidebar-empty">
            Sin resultados aún.<br />
            <small>Pregunta por clima, crypto o noticias.</small>
          </div>
        } @else {
          <div class="mini-cards">
            @for (item of items; track item.id) {
              <div class="mini-card">
                <div class="mini-card-title">{{ item.title }}</div>
                <div class="mini-card-sub">{{ item.subtitle }}</div>
                <!-- Reutilizamos la misma directiva generativa en miniatura -->
                <div class="mini-card-preview">
                  <ng-container
                    [libGenerativeHost]="item.component"
                    [libGenerativeData]="item.data"
                  />
                </div>
              </div>
            }
          </div>
        }
      }
    </aside>
  `,
  styles: [
    `
      .sidebar {
        width: 300px;
        flex-shrink: 0;
        background: var(--surface);
        border-left: 1px solid #293548;
        padding: 1rem;
        overflow-y: auto;
        height: calc(100vh - 60px);
      }
      .sidebar-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
      .sidebar-head h2 { font-size: 0.9rem; margin: 0; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; }
      .sidebar-count { background: var(--accent); color: #0f172a; font-weight: 700; font-size: 0.75rem; padding: 0.1rem 0.5rem; border-radius: 999px; }
      .sidebar-empty { color: #64748b; font-size: 0.85rem; text-align: center; padding: 1.5rem 0.5rem; line-height: 1.5; }
      .sidebar-empty small { font-size: 0.75rem; }
      .mini-cards { display: flex; flex-direction: column; gap: 0.75rem; }
      .mini-card { background: #0f172a; border: 1px solid #293548; border-radius: 10px; padding: 0.6rem; overflow: hidden; }
      .mini-card-title { font-size: 0.8rem; font-weight: 700; text-transform: capitalize; }
      .mini-card-sub { font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.4rem; }
      /* Escalamos la tarjeta generativa para que quepa como miniatura */
      .mini-card-preview { transform: scale(0.62); transform-origin: top left; width: 160%; height: 90px; pointer-events: none; overflow: hidden; }
      .mini-card-preview :is(.widget) { box-shadow: none !important; }
    `,
  ],
})
export class SidebarComponent {
  readonly store = inject(ChatStore);

  // Convertimos el signal de historial en un Observable para rxResource.
  // injector explícito para poder llamarlo fuera del constructor si hace falta.
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
