# Delivery Management System

A full delivery-management platform with three roles — **client**, **courier**,
**dispatcher** — built around a real delivery lifecycle instead of bare
order CRUD.

```
├── backend/   Express + TypeScript + Prisma (PostgreSQL) + Socket.IO API
├── web/       React + TypeScript web app — client tracking + dispatcher console
├── mobile/    Expo (React Native) app — courier route, status, proof of delivery
└── docs/      CONTRACT.md — the shared API/data/socket contract all three build against
```

## Why this isn't "CRUD with extra steps"

There is no endpoint that lets anyone edit a delivery's `status` field
directly. Every change goes through a specific domain action —
`assign`, `accept`, `reject`, `pickup`, `start_transit`, `fail`, `proof`,
`cancel` — validated against a server-side state machine
(`backend/src/services/deliveryStateMachine.ts`) that is the *only* code path
allowed to mutate a delivery's status, and which always appends an
immutable `StatusHistory` row. The full lifecycle of any delivery is
reconstructable from that history, not inferred from a single mutable field.

```
CREATED --assign--> ASSIGNED --pickup--> PICKED_UP --start_transit--> IN_TRANSIT --deliver(proof)--> DELIVERED
   |                    |                                                  |
 cancel               reject/cancel                                      fail
   v                    v                                                  v
CANCELLED            CREATED                                            FAILED
```

## Features

- **Roles**: CLIENT (request + track deliveries), COURIER (mobile app —
  route, status, proof of delivery), DISPATCHER (web console — assign,
  optimize routes, live map, stats).
- **Real-time tracking**: courier location streams over Socket.IO to the
  dispatcher's live map and to clients watching their own delivery.
- **Route optimization (bonus)**: nearest-neighbor + bounded 2-opt heuristic
  over a courier's pending pickups/dropoffs, respecting pickup-before-dropoff
  ordering per delivery (`backend/src/services/routeOptimizer.ts`).
- **ETA prediction (bonus)**: distance-to-go over average speed plus a
  per-stop handling buffer, recomputed on every location ping
  (`backend/src/services/eta.ts`) — isolated behind one function so it can
  later be swapped for a trained model without touching any caller.
- **Proof of delivery**: photo + signature + geo-stamp required to close out
  a delivery as DELIVERED.

See [`docs/CONTRACT.md`](docs/CONTRACT.md) for the full REST API, data model,
and Socket.IO event reference.

## Running it locally

### 1. Backend + database

```bash
docker compose up -d db          # Postgres only
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run seed                     # demo accounts, password: password123
npm run dev                      # http://localhost:4000
```

Demo accounts created by `npm run seed`:

| role       | email                     | password    |
|------------|---------------------------|-------------|
| dispatcher | dispatcher@delivery.app   | password123 |
| client     | client@delivery.app       | password123 |
| courier    | courier@delivery.app      | password123 |

Or run everything (Postgres + backend) via `docker compose up --build`.

### 2. Web app (client + dispatcher)

```bash
cd web
cp .env.example .env   # VITE_API_URL=http://localhost:4000
npm install
npm run dev             # http://localhost:5173
```

### 3. Mobile app (courier)

```bash
cd mobile
npm install
npx expo start
```

Point `EXPO_PUBLIC_API_URL` at your machine's LAN IP (not `localhost`) when
testing on a physical device, since the device can't resolve your dev
machine's loopback address.

## Database

`backend/prisma/schema.prisma` — `User`, `Address`, `Delivery`,
`CourierAssignment`, `Route` / `RouteStop`, `StatusHistory`,
`CourierLocation`. See CONTRACT.md for how they relate.
