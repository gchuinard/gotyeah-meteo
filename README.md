# WeatherNow

Real-time weather forecasts powered by [OpenWeatherMap](https://openweathermap.org/api).

## Stack

| Layer    | Technology                                      |
| -------- | ----------------------------------------------- |
| Frontend | Next.js 16 · TypeScript · Tailwind CSS · shadcn/ui |
| Backend  | FastAPI 0.135+ · Python 3.13 · httpx            |

## Getting started

### 1. Environment

```bash
cp .env.example .env
# Fill in OWM_API_KEY with your OpenWeatherMap key
```

### 2. Run with Docker Compose

```bash
docker compose up --build
```

- Frontend → http://localhost:3000
- Backend API → http://localhost:8000
- API docs → http://localhost:8000/docs

### 3. Run locally (without Docker)

**Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

## Project structure

```
gotyeah-meteo/
├── frontend/
│   ├── app/               # Next.js App Router pages & layouts
│   ├── components/
│   │   ├── ui/            # shadcn/ui base components
│   │   └── weather/       # Domain-specific components
│   ├── hooks/             # React hooks
│   ├── lib/               # Utilities & API client
│   └── types/             # TypeScript types
└── backend/
    └── app/
        ├── main.py        # FastAPI entry point
        ├── config.py      # Settings (pydantic-settings)
        ├── routers/       # Route handlers
        ├── models/        # Pydantic response models
        └── services/      # External API clients (OWM)
```
# gotyeah-meteo
