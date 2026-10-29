/**
 * ============================================================================
 * REGISTRO DE TOOLS (Function Calling)
 * ============================================================================
 * Cada tool es una función que el LLM puede "llamar" para obtener datos del
 * mundo real. Definimos:
 *
 *   - name / description : lo que el LLM lee para decidir cuándo usarla
 *   - inputSchema        : schema JSON de argumentos (formato OpenAI-compatible,
 *                          traducido automáticamente a Claude en su provider)
 *   - handler            : la función REAL que consulta la API
 *   - ui                 : nombre del componente generativo que el frontend
 *                          debe renderizar con el resultado
 *
 * APIs elegidas: todas gratuitas y sin API key (Open-Meteo, CoinGecko, HN).
 */

export const tools = [
  {
    name: 'get_weather',
    description: 'Obtiene el clima actual (temperatura, sensación, condition) de una ciudad.',
    inputSchema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'Nombre de la ciudad, ej: Bogotá' },
      },
      required: ['city'],
    },
    ui: 'weather-card',
    // handler: consulta Open-Meteo (geocoding + forecast), sin API key
    handler: async ({ city }) => {
      // 1) Geocodificar la ciudad a coordenadas
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
      );
      const geo = await geoRes.json();
      const loc = geo.results?.[0];
      if (!loc) throw new Error(`No encontré la ciudad: ${city}`);

      // 2) Pedir el clima actual a esas coordenadas
      const wxRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m`
      );
      const wx = await wxRes.json();
      const cur = wx.current;

      return {
        city: loc.name,
        country: loc.country,
        temperature: cur.temperature_2m,
        feelsLike: cur.apparent_temperature,
        windSpeed: cur.wind_speed_10m,
        // weather_code → descripción legible
        condition: weatherCodeToText(cur.weather_code),
      };
    },
  },

  {
    name: 'get_crypto',
    description: 'Obtiene el precio actual y variación 24h de una criptomoneda (bitcoin, ethereum...).',
    inputSchema: {
      type: 'object',
      properties: {
        coin: {
          type: 'string',
          description: 'ID de la coin en CoinGecko, ej: bitcoin, ethereum, solana',
        },
      },
      required: ['coin'],
    },
    ui: 'crypto-card',
    // handler: consulta CoinGecko simple price, sin API key
    handler: async ({ coin }) => {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coin)}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`
      );
      const data = await res.json();
      const info = data[coin];
      if (!info) throw new Error(`Coin desconocida: ${coin}`);

      return {
        coin,
        priceUsd: info.usd,
        change24h: info.usd_24h_change?.toFixed(2),
        marketCap: info.usd_market_cap,
      };
    },
  },

  {
    name: 'get_news',
    description: 'Obtiene los titulares más populares de Hacker News (tecnología, programación).',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Cuántos titulares devolver (default 5)' },
      },
    },
    ui: 'news-list',
    // handler: consulta la API pública de Hacker News, sin API key
    handler: async ({ limit = 5 }) => {
      const idsRes = await fetch(
        `https://hacker-news.firebaseio.com/v0/topstories.json`
      );
      const ids = (await idsRes.json()).slice(0, limit);

      // Pedimos los detalles de cada story en paralelo
      const stories = await Promise.all(
        ids.map(async (id) => {
          const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          const s = await r.json();
          return { title: s.title, url: s.url, score: s.score, by: s.by };
        })
      );
      return { items: stories };
    },
  },
];

// Traduce los códigos de clima de Open-Meteo a texto legible
function weatherCodeToText(code) {
  const map = {
    0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
    45: 'Niebla', 48: 'Niebla con escarcha', 51: 'Llovizna ligera', 53: 'Llovizna',
    61: 'Lluvia ligera', 63: 'Lluvia', 65: 'Lluvia fuerte', 71: 'Nieve ligera',
    80: 'Chubascos', 81: 'Chubascos fuertes', 95: 'Tormenta', 96: 'Tormenta con granizo',
  };
  return map[code] ?? 'Desconocido';
}
