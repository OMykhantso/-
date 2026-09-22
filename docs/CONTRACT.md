# Delivery Management System — Shared Contract

This document is the source of truth that `backend/`, `web/`, and `mobile/` are all
built against. If backend behavior and this doc ever disagree, the backend code wins
and this doc should be updated.

## Roles

- **CLIENT** — creates delivery requests, tracks their deliveries live, sees history.
- **COURIER** — sees assigned deliveries/route, updates status, submits proof of delivery,
  streams geolocation.
- **DISPATCHER** — sees all deliveries, assigns couriers, optimizes routes, views stats
  dashboard, watches live courier map.

## Core rule: no bare CRUD on deliveries

There is intentionally **no** `PUT/PATCH /deliveries/:id` that lets any field
(including `status`) be edited directly. Every change to a delivery happens through a
domain action (`assign`, `accept`, `reject`, `status`, `proof`, `cancel`) which is
validated against the state machine below and always appends a `StatusHistory` row.
This is enforced server-side in `backend/src/services/deliveryStateMachine.ts` — it is
the only code path allowed to change `Delivery.status`.

## Delivery state machine

```
CREATED --assign(courier)--> ASSIGNED --accept--> ASSIGNED (unchanged, just assignment.status=ACCEPTED)
CREATED --cancel--> CANCELLED
ASSIGNED --reject--> CREATED               (dispatcher must reassign)
ASSIGNED --cancel--> CANCELLED
ASSIGNED --pickup--> PICKED_UP
PICKED_UP --start_transit--> IN_TRANSIT
IN_TRANSIT --deliver(proof)--> DELIVERED   (terminal, proof required)
IN_TRANSIT --fail(reason)--> FAILED        (terminal)
```

`DELIVERED`, `FAILED`, `CANCELLED` are terminal — no further transitions.

## Data model (Prisma, see `backend/prisma/schema.prisma`)

- **User**(id, name, email, passwordHash, phone, role, createdAt)
- **Address**(id, ownerId, label, street, city, lat, lng)
- **Delivery**(id, clientId, pickupAddressId, dropoffAddressId, description, weightKg,
  packageSize, status, etaAt, proofPhotoUrl, proofSignature, proofNote, createdAt, updatedAt)
- **CourierAssignment**(id, deliveryId, courierId, status[ASSIGNED|ACCEPTED|REJECTED|COMPLETED], assignedAt)
- **Route**(id, courierId, status[PLANNED|ACTIVE|COMPLETED], totalDistanceKm, createdAt)
- **RouteStop**(id, routeId, deliveryId, sequence, kind[PICKUP|DROPOFF], lat, lng, etaAt, completedAt)
- **StatusHistory**(id, deliveryId, status, changedById, note, lat, lng, createdAt)
- **CourierLocation**(id, courierId, lat, lng, speedKmh, createdAt) — append-only ping log;
  latest row per courier = current position.

## REST API (base path `/api`)

Auth: `Authorization: Bearer <jwt>`. All non-auth routes require it.

### Auth
- `POST /auth/register` `{name,email,password,phone,role}` → `{token,user}`
- `POST /auth/login` `{email,password}` → `{token,user}`
- `GET /auth/me` → `user`

### Addresses
- `POST /addresses` `{label,street,city,lat,lng}` → `Address`
- `GET /addresses` → `Address[]` (own)

### Deliveries
- `POST /deliveries` `{pickupAddressId,dropoffAddressId,description,weightKg,packageSize}`
  → creates with status `CREATED` (CLIENT only)
- `GET /deliveries?status=&mine=` → role-scoped list (client: own; courier: assigned;
  dispatcher: all)
- `GET /deliveries/:id` → full detail incl. `statusHistory`, `assignment`, `route`, `eta`
- `POST /deliveries/:id/cancel` (CLIENT/DISPATCHER, only while CREATED/ASSIGNED)
- `POST /deliveries/:id/assign` `{courierId}` (DISPATCHER)
- `POST /deliveries/:id/status` `{action, lat, lng, note}` where `action` ∈
  `accept|reject|pickup|start_transit|fail` (COURIER, must own assignment)
- `POST /deliveries/:id/proof` `{photoBase64, signatureBase64, lat, lng, note}` →
  transitions `IN_TRANSIT → DELIVERED` (COURIER)
- `GET /deliveries/:id/eta` → `{etaAt, remainingKm, remainingMinutes}`

### Courier
- `POST /courier/location` `{lat,lng,speedKmh}` → records ping, broadcasts socket event,
  recomputes ETA for the courier's active delivery
- `GET /courier/:id/location` → latest known position

### Routes (multi-delivery optimization)
- `POST /routes/optimize` `{courierId, deliveryIds[]}` (DISPATCHER) → nearest-neighbor +
  2-opt route over pickup/dropoff points, returns ordered `RouteStop[]`
- `GET /routes/active/:courierId` → the courier's current `ACTIVE`/`PLANNED` route with stops
- `POST /routes/stops/:stopId/complete` (COURIER)

### Stats (dispatcher dashboard)
- `GET /stats/overview` → counts by status, today's volume, avg delivery duration
- `GET /stats/couriers` → per-courier completed count, avg duration, distance covered
- `GET /stats/timeseries?days=7` → deliveries created/delivered per day

## Socket.IO (real-time tracking)

Namespace: default `/`. Client sends `auth: {token}` on connect; server joins the socket
to rooms `user:<id>`, `role:<ROLE>`, and for clients with active deliveries
`delivery:<id>`.

Server → client events:
- `delivery:created` (room `role:DISPATCHER`)
- `delivery:assigned` (rooms `user:<courierId>`, `delivery:<id>`)
- `delivery:statusChanged` `{deliveryId,status,at}` (rooms `role:DISPATCHER`, `delivery:<id>`)
- `courier:location` `{courierId,lat,lng,speedKmh,at}` (rooms `role:DISPATCHER`, `delivery:<id>` for each of that courier's active deliveries)
- `route:updated` `{routeId,courierId}` (room `user:<courierId>`)

## ETA prediction (bonus)

Heuristic v1 in `backend/src/services/eta.ts`: haversine distance of the remaining leg(s)
of the courier's route, divided by an assumed average urban speed (configurable,
default 28 km/h), plus a fixed per-stop handling buffer (5 min). Recomputed on every
courier location ping and on every route change. Documented as a heuristic baseline —
swappable later for a regression/ML model trained on `StatusHistory` timestamps without
changing the API shape.

## Route optimization (bonus)

`backend/src/services/routeOptimizer.ts`: nearest-neighbor construction from the
courier's current position over all pickup/dropoff points of the given deliveries,
respecting the constraint that a delivery's pickup stop must precede its dropoff stop,
followed by a bounded 2-opt local search (skipping swaps that would violate that
precedence) to shorten total distance.
