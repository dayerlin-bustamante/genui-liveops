import { Component, inject, input } from '@angular/core';
import { ChatStore } from '../../core/chat.store';

/**
 * HEADER de la app.
 * Muestra el título y el estado en vivo (si hay un stream corriendo).
 * Usa signal inputs (input()) + el signal store.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    <header class="header">
      <div class="brand">
        <span class="brand-logo">◉</span>
        <div class="brand-text">
          <h1>LiveOps Dashboard</h1>
          <span class="brand-sub">Signals · SSE · Generative UI</span>
        </div>
      </div>

      <div class="header-status">
        @if (store.isStreaming()) {
          <span class="status status-live">
            <span class="dot"></span> transmitiendo…
          </span>
        } @else {
          <span class="status status-idle">en espera</span>
        }
        <span class="status provider">provider: {{ provider() }}</span>
      </div>
    </header>
  `,
  styles: [
    `
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.9rem 1.25rem;
        background: var(--surface);
        border-bottom: 1px solid #293548;
        position: sticky;
        top: 0;
        z-index: 10;
      }
      .brand { display: flex; align-items: center; gap: 0.75rem; }
      .brand-logo { color: var(--accent); font-size: 1.5rem; }
      .brand-text h1 { font-size: 1.05rem; margin: 0; }
      .brand-sub { font-size: 0.7rem; color: #64748b; letter-spacing: 0.05em; }
      .header-status { display: flex; align-items: center; gap: 0.6rem; }
      .status {
        font-size: 0.75rem;
        padding: 0.25rem 0.6rem;
        border-radius: 999px;
        background: #0f172a;
        color: #94a3b8;
      }
      .status-live { color: #22c55e; display: flex; align-items: center; gap: 0.35rem; }
      .dot {
        width: 7px; height: 7px; border-radius: 50%;
        background: #22c55e; animation: pulse 1.1s infinite;
      }
      .provider { color: var(--accent); text-transform: capitalize; }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    `,
  ],
})
export class HeaderComponent {
  /** Estado global (para el indicador "transmitiendo…"). */
  readonly store = inject(ChatStore);

  /** Nombre del proveedor LLM activo (input señal, llega del padre). */
  readonly provider = input<string>('mock');
}
