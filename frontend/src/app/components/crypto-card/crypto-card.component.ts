import { Component, Input, computed, signal } from '@angular/core';

/**
 * Componente generativo: tarjeta de precio de cripto.
 * Se crea cuando el backend emite { component: 'crypto-card' }.
 * Muestra precio, variación 24h (con color semántico) y market cap.
 */
@Component({
  selector: 'app-crypto-card',
  standalone: true,
  template: `
    <div class="widget crypto">
      <div class="widget-head">
        <span class="widget-icon">🪙</span>
        <span class="widget-title">{{ coin() }}</span>
        <span class="crypto-change" [class.up]="isUp()" [class.down]="!isUp()">
          {{ changeLabel() }}
        </span>
      </div>

      <div class="crypto-price">\${{ priceLabel() }}</div>

      <div class="crypto-cap">
        Market cap: \${{ marketCapLabel() }}
      </div>
    </div>
  `,
  styles: [
    `
      .crypto { border-top: 3px solid #f7931a; }
      .crypto .widget-head { justify-content: flex-start; gap: 0.5rem; }
      .crypto-price { font-size: 2rem; font-weight: 700; margin-top: 0.35rem; }
      .crypto-change {
        margin-left: auto;
        padding: 0.15rem 0.5rem;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 700;
      }
      .crypto-change.up { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
      .crypto-change.down { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
      .crypto-cap { margin-top: 0.5rem; font-size: 0.8rem; color: #94a3b8; }
    `,
  ],
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
