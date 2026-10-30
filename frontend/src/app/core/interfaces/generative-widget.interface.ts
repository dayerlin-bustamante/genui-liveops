/** Un "widget" generativo: componente a renderizar + sus datos. */
export interface GenerativeWidget {
  component: string; // ej: 'weather-card'
  data: any;
}
