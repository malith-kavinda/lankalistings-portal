# LankaListings Management Portal

Operator portal for LankaListings — Vite 5, React 18, Tailwind.

This is where newspaper images are uploaded and where every machine-generated advertisement is reviewed
before it can be published. **No advertisement reaches the public web or mobile clients without a
moderator approving it here.**

## Requirements

- Node.js 20+
- A running [`lankalistings-media-service`](https://github.com/malith-kavinda/lankalistings-media-service)

This app is installed independently — it is no longer part of an npm workspace.

## Setup

```bash
npm install
cp .env.example .env         # then edit if the API is not on localhost:8001
npm run dev                  # http://localhost:5173
```

The media service must allow this origin. It permits `http://localhost:5173` by default; override with
`MEDIA_SERVICE_CORS_ORIGINS` on the service if you change the port.

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `VITE_MEDIA_API_URL` | `http://localhost:8001` | Base URL of the media service |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server on port 5173 |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |

## Current state

The portal presently supports single-image OCR intake and a basic review panel. Bulk newspaper intake,
per-image batch progress, and the multi-candidate review workspace are specified in the implementation plan
(Phase 4) in [`lankalistings-platform`](https://github.com/malith-kavinda/lankalistings-platform).

## Related repositories

- [`lankalistings-platform`](https://github.com/malith-kavinda/lankalistings-platform) — product docs, PRD, architecture
- [`lankalistings-media-service`](https://github.com/malith-kavinda/lankalistings-media-service) — FastAPI OCR/LLM ingestion service
- [`lankalistings-web`](https://github.com/malith-kavinda/lankalistings-web) — public marketplace
- [`lankalistings-mobile`](https://github.com/malith-kavinda/lankalistings-mobile) — Expo app
