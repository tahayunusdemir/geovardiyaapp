# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
# Start MongoDB (WSL/Linux — required before dev)
sudo systemctl start mongod
# or without systemd:
sudo mongod --dbpath /var/lib/mongodb --fork --logpath /var/log/mongodb/mongod.log

npm run dev       # Next.js dev server → http://localhost:3000
npm run build     # Production build
npm run lint      # ESLint
```

No test suite is configured.

## Required `.env.local`

```
MONGODB_URI=mongodb://localhost:27017/geovardiya
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

Generate VAPID keys: `web-push generate-vapid-keys`

## Architecture

**GeoVardiyaApp** is a geo-fenced shift management PWA. Two user roles — `employer` and `employee` — see completely different dashboards.

### Auth & routing

- NextAuth.js with JWT strategy (`lib/auth.ts`). The JWT carries `id` and `role`.
- `proxy.ts` (Next.js middleware, named per Next 16 convention) enforces role-based access on `/dashboard/*`.
- Registration (`/api/register`) creates only `employee` accounts. Employer accounts must be inserted manually via `mongosh` + bcrypt (see README).

### Data flow — location checking

1. Employee dashboard (or Service Worker via `periodicsync`) calls `POST /api/location/check` with `{lat, lng}`.
2. Route loads the employer's `Workplace` (center + radius), runs `lib/haversine.ts`, saves a `LocationLog`, and if the employee is outside the geofence, sends Web Push notifications to both parties using subscriptions stored in `PushSubscription` (MongoDB).

### Key design decisions

- **`proxy.ts` instead of `middleware.ts`**: Next.js 16 renamed the middleware file. Do not rename it back.
- **Leaflet is client-only**: `WorkplaceMap.tsx` must stay a Client Component. Leaflet cannot run in SSR.
- **Push subscriptions stored in MongoDB**: `app/actions.ts` (Server Actions) manages subscribe/unsubscribe. The Service Worker (`public/sw.js`) handles background `periodicsync` and `push` events.
- **Haversine in `lib/haversine.ts`**: pure function, Earth-radius-based, returns meters.

### Employer account creation

The UI only registers employees. Create employer accounts manually:

```bash
node -e "const b=require('bcryptjs'); b.hash('password', 12).then(console.log)"
mongosh geovardiya
# then db.users.insertOne({ name, surname, email, password: "<hash>", role: "employer", createdAt: new Date() })
```
