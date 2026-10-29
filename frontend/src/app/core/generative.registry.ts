import { Type } from '@angular/core';
import { WeatherCardComponent } from '../components/weather-card/weather-card.component';
import { CryptoCardComponent } from '../components/crypto-card/crypto-card.component';
import { NewsListComponent } from '../components/news-list/news-list.component';

/**
 * REGISTRO DE COMPONENTES GENERATIVOS
 * ============================================================================
 * Mapa "nombre del componente (que manda el backend en el evento ui)"
 *      → "componente Angular real".
 *
 * El backend envía algo como:
 *   { component: 'weather-card', data: {...} }
 * y el directive GenerativeHostDirective busca aquí qué componente crear
 * dinámicamente con createComponent().
 *
 * Para agregar una nueva tarjeta generativa:
 *   1. Crear el componente en /components
 *   2. Registrarlo aquí con su nombre
 *   3. (backend) agregar una tool cuyo campo `ui` sea ese nombre
 */
export const generativeRegistry: Record<string, Type<any>> = {
  'weather-card': WeatherCardComponent,
  'crypto-card': CryptoCardComponent,
  'news-list': NewsListComponent,
};
