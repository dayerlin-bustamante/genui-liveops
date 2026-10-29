import { Component, Input, computed, signal } from '@angular/core';

/**
 * Componente generativo: lista de noticias (Hacker News).
 * Se crea cuando el backend emite { component: 'news-list' }.
 * Renderiza cada titular como enlace con su puntaje.
 */
@Component({
  selector: 'app-news-list',
  standalone: true,
  template: `
    <div class="widget news">
      <div class="widget-head">
        <span class="widget-icon">📰</span>
        <span class="widget-title">Top noticias</span>
        <span class="news-count">{{ items().length }}</span>
      </div>

      <ul class="news-list">
        @for (item of items(); track $index) {
          <li class="news-item">
            <span class="news-score" title="puntos">▲ {{ item.score ?? 0 }}</span>
            @if (item.url) {
              <a [href]="item.url" target="_blank" rel="noopener">
                {{ item.title }}
              </a>
            } @else {
              <span class="news-title">{{ item.title }}</span>
            }
            <span class="news-by">por {{ item.by ?? 'anon' }}</span>
          </li>
        }
      </ul>
    </div>
  `,
  styles: [
    `
      .news { border-top: 3px solid #ff6600; }
      .news-count {
        margin-left: auto;
        background: rgba(255, 102, 0, 0.15);
        color: #ff6600;
        font-weight: 700;
        padding: 0.1rem 0.5rem;
        border-radius: 999px;
        font-size: 0.75rem;
      }
      .news-list { list-style: none; padding: 0; margin: 0.75rem 0 0; display: flex; flex-direction: column; gap: 0.5rem; }
      .news-item { display: flex; align-items: baseline; gap: 0.5rem; font-size: 0.9rem; line-height: 1.3; }
      .news-score { color: #ff6600; font-weight: 700; font-size: 0.75rem; white-space: nowrap; }
      .news-item a { color: #e2e8f0; text-decoration: none; }
      .news-item a:hover { color: #38bdf8; text-decoration: underline; }
      .news-by { color: #64748b; font-size: 0.75rem; white-space: nowrap; margin-left: auto; }
    `,
  ],
})
export class NewsListComponent {
  @Input({ required: true }) set data(v: any) {
    this._data.set(v ?? {});
  }

  private readonly _data = signal<any>({});

  // Extraemos el array de items (el backend manda { items: [...] })
  readonly items = computed<any[]>(() => this._data()?.items ?? []);
}
