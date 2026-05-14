# WeatherNow

Real-time weather forecasts powered by [OpenWeatherMap](https://openweathermap.org/api),
with user accounts, saved cities, and a themeable, multilingual UI.

## Features

- **Weather** — current conditions, hourly (24 h) and daily forecasts, air quality, sunrise/sunset arc
- **Search & location** — city autocomplete, geolocation on load, or a pinned "home" city
- **Accounts** — JWT auth with refresh-token rotation, drag-to-reorder favorite cities, saved preferences
- **Personalization** — 6 colour themes and 5 UI languages (EN / FR / ES / DE / JA)
- **Admin** — back-office to browse users, favorites and database tables

## Stack

| Layer    | Technology                                                |
| -------- | --------------------------------------------------------- |
| Frontend | Next.js 16 · React 19 · TypeScript · Tailwind CSS         |
| Backend  | FastAPI · Python 3.14 · SQLAlchemy · PostgreSQL · Alembic |

## Getting started

### 1. Environment

```bash
cp .env.example .env
# Fill in OWM_API_KEY with your OpenWeatherMap key
```

### 2. Run with Docker Compose

The Compose stack attaches to an external Docker network (shared with the reverse
proxy in production). Create it once before the first run:

```bash
docker network create weathernow-net
docker compose up --build
```

Containers are published on the `weathernow-net` network only — there are no host
port mappings. For direct `localhost` access during development, use the
"Run locally" steps below.

### 3. Run locally (without Docker)

**Backend** — requires a PostgreSQL instance reachable via `DATABASE_URL`:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head        # apply database migrations
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
│   ├── components/        # Layout & weather UI components
│   ├── context/           # React contexts (auth, theme)
│   ├── hooks/             # React hooks
│   ├── lib/               # API clients, i18n, themes, units
│   └── types/             # TypeScript types
└── backend/
    ├── alembic/           # Database migrations
    └── app/
        ├── main.py        # FastAPI entry point
        ├── config.py      # Settings (pydantic-settings)
        ├── core/          # Security — password hashing, JWT
        ├── db/            # SQLAlchemy engine & ORM models
        ├── models/        # Pydantic weather response models
        ├── routers/       # Route handlers (weather, auth, user, admin)
        ├── schemas/       # Pydantic request/response schemas
        └── services/      # External API clients (OWM)
```
