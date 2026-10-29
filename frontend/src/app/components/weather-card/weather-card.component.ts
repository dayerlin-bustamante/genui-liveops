import { Component, Input, computed, signal } from '@angular/core';

/**
 * Componente generativo: tarjeta de clima.
 * Se crea dinámicamente cuando el backend emite { component: 'weather-card' }.
 * Usa signal inputs (input.required) y computed para derivar estado.
 *
 * Estructura de archivos: .html (plantilla) · .scss (estilos) · .ts (lógica)
 */
@Component({
  selector: 'app-weather-card',
  standalone: true,
  templateUrl: './weather-card.component.html',
  styleUrl: './weather-card.component.scss',
})
export class WeatherCardComponent {
  /** Datos que envía el backend (ciudad, temp, etc.). */
  @Input({ required: true }) set data(v: any) {
    this._data.set(v ?? {});
  }

  private readonly _data = signal<any>({});

  // Derivamos los valores con computed para no repetir `?.` en la plantilla
  readonly temperature = computed(() => this._data()?.temperature ?? '–');
  readonly city = computed(() => this._data()?.city ?? '');
  readonly country = computed(() => this._data()?.country ?? '');
  readonly condition = computed(() => this._data()?.condition ?? '');
  readonly feelsLike = computed(() => this._data()?.feelsLike ?? '–');
  readonly windSpeed = computed(() => this._data()?.windSpeed ?? '–');
}
