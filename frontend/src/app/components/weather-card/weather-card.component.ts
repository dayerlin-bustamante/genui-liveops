import { Component, Input, computed, signal } from '@angular/core';

/**
 * Componente generativo: tarjeta de clima.
 * Se crea dinámicamente cuando el backend emite { component: 'weather-card' }.
 * Usa signal inputs (input.required) y computed para derivar estado.
 */
@Component({
  selector: 'app-weather-card',
  standalone: true,
  template: `
    <div class="widget weather">
      <div class="widget-head">
        <span class="widget-icon">🌤️</span>
        <span class="widget-title">Clima</span>
      </div>

      <div class="weather-main">
        <span class="weather-temp">{{ temperature() }}°</span>
        <span class="weather-city">{{ city() }}, {{ country() }}</span>
      </div>

      <div class="weather-condition">{{ condition() }}</div>

      <div class="weather-details">
        <div class="detail">
          <span class="detail-label">Sensación</span>
          <span class="detail-value">{{ feelsLike() }}°</span>
        </div>
        <div class="detail">
          <span class="detail-label">Viento</span>
          <span class="detail-value">{{ windSpeed() }} km/h</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .weather { border-top: 3px solid #38bdf8; }
      .weather-main { display: flex; flex-direction: column; align-items: baseline; gap: 0.15rem; }
      .weather-temp { font-size: 2.6rem; font-weight: 700; line-height: 1; }
      .weather-city { color: #94a3b8; font-size: 0.9rem; }
      .weather-condition { margin: 0.5rem 0; color: #38bdf8; font-weight: 600; }
      .weather-details { display: flex; gap: 1.5rem; margin-top: 0.75rem; }
      .detail { display: flex; flex-direction: column; }
      .detail-label { font-size: 0.7rem; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
      .detail-value { font-weight: 600; }
    `,
  ],
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
