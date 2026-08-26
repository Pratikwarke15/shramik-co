# SIH26089: Cooperative Gig Services Platform

> **CoopGig** — A production-ready full-stack platform for Cooperative Gig Services, enabling fair, transparent, and community-driven household & community services.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router, TailwindCSS, TypeScript, PWA) |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + PostGIS (geospatial) + Prisma ORM |
| Real-time | WebSocket (ws) |
| Auth | JWT with role-based access control |
| Payments | UPI gateway stub |
| Docs | Swagger/OpenAPI at `/api/docs` |

## Architecture

```
sih26089/
├── apps/
│   ├── web/          # Next.js 14 Consumer & Worker portals
│   └── api/          # Express REST API + WebSocket server
├── packages/
│   └── db/           # Prisma schema, migrations & seed
├── docker-compose.yml
└── .env
```

## Quick Start

### Prerequisites
- Node.js >= 18
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### 1. Start Database
```bash
docker compose up -d postgres redis
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Database
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 4. Start Development
```bash
npm run dev
```

This starts:
- **API**: http://localhost:4000
- **API Docs**: http://localhost:4000/api/docs
- **Web**: http://localhost:3000

### Docker (Full Stack)
```bash
docker compose up -d
```

## Demo Accounts

| Role | Phone | Password |
|------|-------|----------|
| Consumer | 9876543201 | password123 |
| Worker | 9876543210 | password123 |
| Coop Admin | 9876543220 | password123 |
| Super Admin | 9999999999 | admin123 |

## Features

### Consumer Portal
- Multi-step service booking with geospatial worker matching
- Real-time booking tracker
- Wallet & transaction history
- Rating & review system

### Worker Portal
- On-duty/off-duty toggle
- Job acceptance & management
- Earnings dashboard with dividend tracking
- Social security fund management
- KYC verification (DigiLocker mock)

### Co-op Admin Portal
- Worker management & verification
- Service configuration & pricing
- Dispute resolution
- Dividend calculation & distribution
- Revenue analytics

### Platform Features
- PostGIS `ST_DWithin` for location-based worker discovery
- Commission engine capped at <5%
- Auto patronage dividend calculation
- WebSocket real-time updates
- Multi-role JWT authentication
- Zod input validation on all endpoints
- Swagger API documentation

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/send-otp` | Send OTP to phone |
| POST | `/api/v1/auth/verify-otp` | Verify OTP |
| POST | `/api/v1/auth/register` | Register user |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/bookings` | Create booking |
| GET | `/api/v1/bookings` | List bookings |
| GET | `/api/v1/bookings/nearby-workers` | Find nearby workers |
| PATCH | `/api/v1/bookings/:id/status` | Update booking status |
| POST | `/api/v1/bookings/:id/rate` | Rate completed booking |
| POST | `/api/v1/payments/initiate` | Initiate UPI payment |
| POST | `/api/v1/payments/confirm` | Confirm payment |
| GET | `/api/v1/workers/search` | Search workers by location |
| POST | `/api/v1/disputes` | Create dispute |
| GET | `/api/v1/coops/:id/dashboard` | Coop dashboard stats |
| POST | `/api/v1/coops/:id/dividends` | Calculate dividends |

Full API documentation: http://localhost:4000/api/docs

## Environment Variables

Copy `.env.example` to `.env` and configure:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret
- `API_PORT` — Backend port (default: 4000)
- `CORS_ORIGIN` — Frontend URL

## License

Built for Smart India Hackathon 2026.
