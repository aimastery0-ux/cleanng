# CleanNG — Nigeria's cleaning marketplace

A two-sided marketplace connecting customers with verified independent cleaners. Lagos-first.

## Stack

| Layer | Tech |
|---|---|
| Backend | Django 5 + DRF + PostgreSQL |
| Real-time | Django Channels + Redis |
| Tasks | Celery + Redis |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS (DM Sans, orange brand) |
| Payments | Flutterwave |
| SMS | Termii |
| Storage | Cloudinary |
| Maps | Google Maps Platform |

---

## Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

Install on macOS with Homebrew:

```bash
brew install python@3.11 node postgresql@15 redis
brew services start postgresql@15
brew services start redis
```

---

## Backend setup

```bash
cd backend

# Create and activate virtual environment
python3.11 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — fill in DATABASE_URL, DJANGO_SECRET_KEY, etc.

# Create database
createdb cleanng

# Run migrations
python manage.py migrate

# Seed demo data (5 cleaners, 5 customers, 1 admin)
python manage.py seed_demo

# Create a superuser (optional — seed_demo creates admin@demo.cleanng.com / Admin1234!)
python manage.py createsuperuser
```

### Run the backend

```bash
# Django dev server (API on :8000)
python manage.py runserver

# Celery worker (background tasks)
celery -A config worker -l info

# Celery beat (scheduled tasks — reminders, etc.)
celery -A config beat -l info

# Or use ASGI for WebSocket support in dev
daphne config.asgi:application
```

---

## Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — set VITE_API_BASE_URL, VITE_GOOGLE_MAPS_API_KEY, VITE_FLW_PUBLIC_KEY

# Start dev server (app on :5173)
npm run dev
```

---

## API docs

Once the backend is running:

- **Swagger UI:** http://localhost:8000/api/docs/
- **ReDoc:** http://localhost:8000/api/redoc/
- **OpenAPI schema:** http://localhost:8000/api/schema/

---

## Demo credentials (after `seed_demo`)

| Role | Email | Password |
|---|---|---|
| Admin | admin@demo.cleanng.com | Admin1234! |
| Cleaner 1 | cleaner1@demo.cleanng.com | Cleaner1234! |
| Cleaner 2 | cleaner2@demo.cleanng.com | Cleaner1234! |
| Customer 1 | customer1@demo.cleanng.com | Customer1234! |

---

## Build phases

| Phase | Feature |
|---|---|
| 0 ✅ | Foundation — Django + React scaffolding, shared UI |
| 1 | Auth + onboarding (OTP, Google OAuth, wizard) |
| 2 | Cleaner profiles + service listing + availability |
| 3 | Search + map discovery |
| 4 | Booking flow + state machine |
| 5 | Flutterwave payments + escrow + payout |
| 6 | In-app messaging (Django Channels) |
| 7 | Reviews + ratings |
| 8 | Notifications (SMS + email + in-app) |
| 9 | Admin panel |
| 10 | Hardening + accessibility + e2e test |

---

## WebSocket

Chat is over WebSocket at:

```
ws://localhost:8000/ws/bookings/<booking_id>/chat/
```

Send a JWT in the `Authorization` header or via a query param for the connection handshake (ASGI auth middleware required — see `config/asgi.py`).

---

## Commit structure

Each phase maps to one or more commits. Tags: `phase-0`, `phase-1`, etc.
