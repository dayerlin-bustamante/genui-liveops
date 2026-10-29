import { Component, Input, computed, signal } from '@angular/core';

/**
 * Componente generativo: lista de noticias (Hacker News).
 * Se crea cuando el backend emite { component: 'news-list' }.
 * Renderiza cada titular como enlace con su puntaje.
 *
 * Estructura de archivos: .html (plantilla) · .scss (estilos) · .ts (lógica)
 */
@Component({
  selector: 'app-news-list',
  standalone: true,
  templateUrl: './news-list.component.html',
  styleUrl: './news-list.component.scss',
})
export class NewsListComponent {
  @Input({ required: true }) set data(v: any) {
    this._data.set(v ?? {});
  }

  private readonly _data = signal<any>({});

  // Extraemos el array de items (el backend manda { items: [...] })
  readonly items = computed<any[]>(() => this._data()?.items ?? []);
}
