import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HeaderComponent } from './shell/header/header.component';
import { SidebarComponent } from './shell/sidebar/sidebar.component';
import { ChatComponent } from './features/chat/chat.component';

/**
 * Shell de la aplicación: HEADER + (CHAT | SIDEBAR).
 * Sin Angular Router (decisión de diseño: es una sola vista).
 *
 * Al arrancar consulta /api/health para saber qué proveedor LLM está activo
 * y mostrarlo en el header.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HeaderComponent, SidebarComponent, ChatComponent],
  template: `
    <app-header [provider]="provider()" />

    <div class="layout">
      <app-chat />
      <app-sidebar />
    </div>
  `,
  styles: [
    `
      :host { display: block; min-height: 100vh; }
      .layout { display: flex; }
    `,
  ],
})
export class AppComponent {
  private readonly http = inject(HttpClient);

  /** Proveedor LLM activo (lo trae el backend desde .env). */
  readonly provider = signal('…');

  constructor() {
    // Pedimos el health para pintar el proveedor en el header
    this.http.get<{ provider: string }>('/api/health').subscribe({
      next: (res) => this.provider.set(res.provider ?? 'desconocido'),
      error: () => this.provider.set('offline'),
    });
  }
}
