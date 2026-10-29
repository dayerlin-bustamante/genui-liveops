import { Component, Input, computed, signal } from '@angular/core';

/**
 * Componente generativo: tarjeta de precio de cripto.
 * Se crea cuando el backend emite { component: 'crypto-card' }.
 * Muestra precio, variación 24h (con color semántico) y market cap.
 *
 * Estructura de archivos: .html (plantilla) · .scss (estilos) · .ts (lógica)
 */
@Component({
  selector: 'app-crypto-card',
  standalone: true,
  templateUrl: './crypto-card.component.html',
  styleUrl: './crypto-card.component.scss',
})
export class CryptoCardComponent {
  @Input({ required: true }) set data(v: any) {
    this._data.set(v ?? {});
  }

  private readonly _data = signal<any>({});

  readonly coin = computed(() => capitalize(this._data()?.coin ?? 'Crypto'));
  readonly priceLabel = computed(() =>
    formatNumber(this._data()?.priceUsd)
  );
  readonly marketCapLabel = computed(() =>
    formatNumber(this._data()?.marketCap, true)
  );

  // Variación 24h → la mostramos con signo y color
  readonly changeRaw = computed(() => Number(this._data()?.change24h ?? 0));
  readonly isUp = computed(() => this.changeRaw() >= 0);
  readonly changeLabel = computed(() =>
    `${this.isUp() ? '▲' : '▼'} ${Math.abs(this.changeRaw()).toFixed(2)}%`
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatNumber(n: unknown, compact = false): string {
  if (typeof n !== 'number') return String(n ?? '–');
  return compact
    ? new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 }).format(n)
    : n.toLocaleString('en-US');
}
