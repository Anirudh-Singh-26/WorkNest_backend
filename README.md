# Fixl Backend

Node.js + Express + TypeScript backend for the Fixl collaborative project and task management platform.

## Stack

- Node.js
- Express
- TypeScript
- MongoDB
- Mongoose
- JWT
- bcrypt
- Socket.IO

## Responsibilities

The backend provides:

- Authentication and session handling
- Workspace and project APIs
- Role-based authorization
- Task management
- Task version/concurrency checks
- Dependencies
- Comments
- Notifications
- Activity history
- Search/filtering
- Bulk operations
- Calendar and Timeline APIs
- Analytics
- Offline-safe API behavior
- Socket.IO events

## Structure

```text
backend/
├── controllers/
├── middleware/
├── models/
├── routes/
├── utils/
├── tests/
├── seed.ts
├── server.ts
├── package.json
└── .env.example
```

## Environment Variables

Create `.env` locally from `.env.example`.

Example:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
CLIENT_URL=http://localhost:5173
```

Never commit the real `.env`.

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Tests

```bash
npm test
```

The test suite focuses on authentication, authorization, task validation, concurrency conflicts, bulk operations, filtering and protection of sensitive fields.

## Seed Data

The backend includes a seed script for local demo data.

Run:

```bash
npm run seed
```

See `SEED_README.md` for the demo users and generated data.

## Health Check

The backend exposes a health/readiness endpoint for checking whether the server is running.

## Security

- Password hashing with bcrypt
- JWT authentication
- HttpOnly cookies
- Backend authorization checks
- Rate limiting on sensitive endpoints
- Version checks for important task updates
- No password hashes or secrets in API responses

## Realtime

Socket.IO is used for task, comment, notification and presence updates.

See the central project's `docs/websocket.md` for event details.

## API

The backend API is organized around:

- `/auth`
- `/workspaces`
- `/projects`
- `/tasks`
- `/comments`
- `/notifications`
- `/dependencies`
- `/activity`
- `/analytics`

See the central API documentation for the complete endpoint overview.
