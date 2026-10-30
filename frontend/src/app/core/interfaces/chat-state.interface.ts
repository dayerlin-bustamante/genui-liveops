import type { ChatMessage } from './chat-message.interface';
import type { HistoryItem } from './history-item.interface';

/** Forma del estado del chat. */
export interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  history: HistoryItem[];
}
