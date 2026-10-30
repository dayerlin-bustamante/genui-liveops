/** Ítem del historial (mini-cards del sidebar). */
export interface HistoryItem {
  id: string;
  component: string;
  title: string;   // texto corto para la mini-card (ej: 'Bitcoin')
  subtitle: string; // dato principal (ej: '$80,792')
  data: any;
}
