/** Estado de una herramienta en curso (para mostrar "consultando…"). */
export interface ToolStatus {
  name: string;
  state: 'running' | 'done' | 'error';
  error?: string;
}
