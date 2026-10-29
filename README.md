# genui-liveops

**LiveOps Dashboard** — Asistente con IA que combina:

- **Angular moderno** (Signals, standalone components, `resource()`)
- **Streaming SSE** (Server-Sent Events) para respuestas token a token
- **Tool Calling / Generative UI**: el LLM decide qué APIs consultar en tiempo real (clima, cripto, noticias...) y el frontend renderiza componentes visuales automáticamente según el resultado.

## Estructura

```
genui-liveops/
├── frontend/          # Angular (Signals + SSE + Generative UI)
├── backend/           # Node/Express + SSE + Tool Calling
├── docker-compose.yml
└── README.md
```

## Desarrollo

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm start
```

## Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:4200
- Backend: http://localhost:3000

## Configuración

Copia `.env.example` del backend a `.env` y define tu API key:

```bash
cp backend/.env.example backend/.env
```
