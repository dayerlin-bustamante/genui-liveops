import { Component, input } from '@angular/core';
import { GenerativeHostDirective } from '../../directives/generative-host.directive';
import type { ChatMessage } from '../../core/chat.types';

/**
 * Componente que renderiza UN mensaje del chat.
 * Muestra:
 *   - el texto (que crece con el streaming de tokens)
 *   - indicadores de tools en curso / terminadas
 *   - las tarjetas generativas embebidas (via GenerativeHostDirective)
 */
@Component({
  selector: 'app-message',
  standalone: true,
  imports: [GenerativeHostDirective],
  template: `
    <div class="message" [class.user]="message().role === 'user'">
      <div class="avatar">{{ message().role === 'user' ? '🧑' : '◉' }}</div>

      <div class="bubble">
        <!-- Indicadores de tools: "consultando clima…" -->
        @if (message().tools.length) {
          <div class="tools">
            @for (t of message().tools; track $index) {
              <span class="tool" [class]="'tool ' + t.state">
                @if (t.state === 'running') {
                  <span class="spinner"></span> consultando {{ t.name }}…
                } @else if (t.state === 'done') {
                  ✓ {{ t.name }}
                } @else {
                  ✗ {{ t.name }}: {{ t.error }}
                }
              </span>
            }
          </div>
        }

        <!-- Texto del mensaje (streaming) -->
        @if (message().content) {
          <p class="text">{{ message().content }}</p>
        }

        <!-- Tarjetas generativas embebidas -->
        @if (message().widgets.length) {
          <div class="widgets">
            @for (w of message().widgets; track $index) {
              <ng-container
                [libGenerativeHost]="w.component"
                [libGenerativeData]="w.data"
              />
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .message { display: flex; gap: 0.6rem; margin-bottom: 1rem; align-items: flex-start; }
      .message.user { flex-direction: row-reverse; }
      .avatar {
        width: 32px; height: 32px; border-radius: 50%;
        display: grid; place-items: center;
        background: #0f172a; flex-shrink: 0; font-size: 0.9rem;
      }
      .message.user .avatar { background: var(--accent); }
      .bubble {
        max-width: min(560px, 80%);
        background: var(--surface);
        padding: 0.7rem 0.9rem;
        border-radius: 12px;
        border-top-left-radius: 4px;
      }
      .message.user .bubble {
        background: var(--accent); color: #0f172a;
        border-top-left-radius: 12px; border-top-right-radius: 4px;
      }
      .text { margin: 0; line-height: 1.5; white-space: pre-wrap; }
      .tools { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.5rem; }
      .tool {
        display: inline-flex; align-items: center; gap: 0.35rem;
        font-size: 0.72rem; padding: 0.15rem 0.5rem; border-radius: 999px;
        background: #0f172a; color: #94a3b8;
      }
      .tool.done { color: #22c55e; }
      .tool.error { color: #ef4444; }
      .spinner {
        width: 8px; height: 8px; border: 2px solid #38bdf8;
        border-top-color: transparent; border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }
      .widgets { display: flex; flex-direction: column; gap: 0.6rem; margin-top: 0.6rem; }
      @keyframes spin { to { transform: rotate(360deg); } }
    `,
  ],
})
export class MessageComponent {
  /** Mensaje a renderizar (signal input). */
  readonly message = input.required<ChatMessage>();
}
