import { Component, signal } from '@angular/core';
import { SseService } from './core/sse.service';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <h1>🎯 LiveOps Dashboard</h1>
    <p>Angular Signals + SSE + Tool Calling / Generative UI</p>

    <div class="chat">
      @for (msg of messages(); track $index) {
        <div class="message" [class.user]="msg.role === 'user'">
          {{ msg.content }}
        </div>
      }
    </div>
  `,
  styles: [
    `
      .chat { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem; }
      .message { background: var(--surface); padding: 0.75rem 1rem; border-radius: 8px; }
      .message.user { background: var(--accent); color: #0f172a; align-self: flex-end; }
    `,
  ],
})
export class AppComponent {
  readonly messages = signal<{ role: 'user' | 'assistant'; content: string }[]>([]);

  constructor(private readonly sse: SseService) {}
}
