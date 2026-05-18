# auprea-api

REST API for the Auprea wealth management platform — built with Express, Prisma, and PostgreSQL.

---

## Stack

| Tool                  | Purpose                                          |
|-----------------------|--------------------------------------------------|
| Node.js ≥ 18          | Runtime                                          |
| Express 4             | HTTP framework                                   |
| Prisma 5              | ORM + migrations                                 |
| PostgreSQL ≥ 14       | Primary database                                 |
| bcryptjs              | Password hashing (cost factor 12)                |
| jsonwebtoken          | Signed JWT access tokens                         |
| uuid                  | Opaque refresh tokens                            |
| cookie-parser         | httpOnly refresh token cookie                    |
| passport              | OAuth strategy runner                            |
| passport-google-oauth20 | Google OAuth 2.0 (scaffold — activate with env vars) |
| passport-linkedin-oauth2 | LinkedIn OAuth 2.0 (scaffold — activate with env vars) |
| helmet                | Security headers                                 |
| cors                  | Cross-origin requests                            |
| express-rate-limit    | Rate limiting                                    |
| express-validator     | Request validation                               |
| morgan                | HTTP request logging                             |

---

## Getting Started

### 1 — Install

```bash
npm install
```

### 2 — Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/auprea"

JWT_SECRET="a-long-random-secret-min-32-chars"
JWT_EXPIRES_IN="15m"

REFRESH_SECRET="another-long-random-secret"
REFRESH_EXPIRES_IN="7d"

# Optional — OAuth (leave blank to disable)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
LINKEDIN_CLIENT_ID=""
LINKEDIN_CLIENT_SECRET=""

CLIENT_URL="http://localhost:3000"
PORT=4000
NODE_ENV="development"
```

### 3 — Run migrations

```bash
npx prisma migrate dev --name init
```

### 4 — Seed demo data

```bash
npm run db:seed
```

Inserts a fully-populated demo user:

| Email                  | Password      |
|------------------------|---------------|
| `john.doe@example.com` | `password123` |
| `demo@auprea.com`      | `demo1234`    |

### 5 — Start

```bash
npm run dev    # nodemon — restarts on file changes
npm start      # production-style (no auto-restart)
```

The API listens on **http://localhost:4000**.

---

## Project Structure

```
auprea-api/
├── prisma/
│   ├── schema.prisma        # Data models
│   ├── seed.js              # Demo data seeder
│   └── migrations/          # Auto-generated migration history
│
└── src/
    ├── index.js             # App entry — Express setup, middleware, route mounting
    ├── config.js            # Validated env vars (throws on missing required vars)
    │
    ├── lib/
    │   ├── prisma.js        # Prisma client singleton
    │   └── tokens.js        # JWT signing, refresh token creation/rotation/revocation
    │
    ├── middleware/
    │   ├── auth.js          # JWT verification → sets req.userId
    │   ├── validate.js      # express-validator wrapper (returns 422 on errors)
    │   └── errorHandler.js  # Global error handler (maps Prisma codes to HTTP status)
    │
    └── routes/
        ├── auth.js          # /api/auth — register, login, refresh, logout, OAuth
        ├── me.js            # /api/me  — profile CRUD + spouse/children/kin/accounts
        ├── assets.js        # /api/assets + /api/assets/:id/documents
        ├── debts.js         # /api/debts
        ├── notifications.js # /api/notifications
        └── familyMembers.js # /api/family-members
```

---

## Data Model

```
User
 ├── Spouse          (one-to-one)
 ├── Child[]         (one-to-many)
 ├── NextOfKin[]     (one-to-many)
 ├── BankAccount[]   (one-to-many)
 ├── Asset[]         (one-to-many)
 │    └── Document[] (one-to-many)
 ├── Debt[]          (one-to-many)
 ├── Notification[]  (one-to-many)
 ├── FamilyMember[]  (one-to-many)
 └── RefreshToken[]  (one-to-many)
```

All child records cascade-delete when the parent User is deleted.

---

## API Reference

### Authentication — `/api/auth`

| Method | Path                | Auth | Description                          |
|--------|---------------------|------|--------------------------------------|
| POST   | `/register`         | —    | Create account, returns access token |
| POST   | `/login`            | —    | Login, returns access token          |
| POST   | `/refresh`          | —    | Rotate refresh token, returns new access token |
| POST   | `/logout`           | —    | Revoke refresh token cookie          |
| GET    | `/google`           | —    | Redirect to Google OAuth             |
| GET    | `/google/callback`  | —    | Google OAuth callback                |
| GET    | `/linkedin`         | —    | Redirect to LinkedIn OAuth           |
| GET    | `/linkedin/callback`| —    | LinkedIn OAuth callback              |

**Register / Login response:**
```json
{
  "accessToken": "eyJ...",
  "user": { "id": "uuid", "email": "...", "firstName": "...", "lastName": "..." }
}
```

**Refresh token** is an opaque UUID stored in the database and delivered via an `httpOnly; SameSite=Lax; Path=/` cookie named `rt`.

---

### Profile — `/api/me` *(requires Bearer token)*

| Method | Path                         | Description                          |
|--------|------------------------------|--------------------------------------|
| GET    | `/`                          | Full profile with spouse, children, next-of-kin, bank accounts |
| PUT    | `/`                          | Update profile fields                |
| PUT    | `/spouse`                    | Upsert spouse                        |
| DELETE | `/spouse`                    | Remove spouse                        |
| GET    | `/children`                  | List children                        |
| POST   | `/children`                  | Add child                            |
| PUT    | `/children/:id`              | Update child                         |
| DELETE | `/children/:id`              | Remove child                         |
| GET    | `/next-of-kin`               | List next-of-kin                     |
| POST   | `/next-of-kin`               | Add next-of-kin                      |
| PUT    | `/next-of-kin/:id`           | Update next-of-kin                   |
| DELETE | `/next-of-kin/:id`           | Remove next-of-kin                   |
| GET    | `/bank-accounts`             | List bank accounts                   |
| POST   | `/bank-accounts`             | Add bank account                     |
| PUT    | `/bank-accounts/:id`         | Update bank account                  |
| DELETE | `/bank-accounts/:id`         | Remove bank account                  |

---

### Assets — `/api/assets` *(requires Bearer token)*

| Method | Path                              | Description           |
|--------|-----------------------------------|-----------------------|
| GET    | `/`                               | List all assets       |
| POST   | `/`                               | Create asset          |
| PUT    | `/:id`                            | Update asset          |
| DELETE | `/:id`                            | Delete asset          |
| POST   | `/:id/documents`                  | Attach document name  |
| DELETE | `/:assetId/documents/:docId`      | Remove document       |

---

### Debts — `/api/debts` *(requires Bearer token)*

| Method | Path   | Description  |
|--------|--------|--------------|
| GET    | `/`    | List debts   |
| POST   | `/`    | Create debt  |
| PUT    | `/:id` | Update debt  |
| DELETE | `/:id` | Delete debt  |

---

### Notifications — `/api/notifications` *(requires Bearer token)*

| Method | Path          | Description                    |
|--------|---------------|--------------------------------|
| GET    | `/`           | List (newest first)            |
| PATCH  | `/:id/read`   | Mark one as read               |
| PATCH  | `/read-all`   | Mark all as read               |
| DELETE | `/:id`        | Delete notification            |

---

### Family Members — `/api/family-members` *(requires Bearer token)*

| Method | Path   | Description          |
|--------|--------|----------------------|
| GET    | `/`    | List family members  |
| POST   | `/`    | Add family member    |
| PUT    | `/:id` | Update role/details  |
| DELETE | `/:id` | Remove member        |

---

### Health

```
GET /health  →  { "status": "ok" }
```

---

## Authentication Details

### Token lifecycle

```
Login / Register
      │
      ▼
Access token (JWT, 15 min)  ──▶  returned in response body
Refresh token (UUID, 7 days) ──▶  httpOnly cookie "rt"
      │
      ▼ (token expires)
POST /api/auth/refresh
      │  browser sends "rt" cookie automatically
      ▼
New access token + rotated refresh token
      │
      ▼ (cookie invalid / expired)
401 → client redirects to /login
```

- Every `401 TOKEN_EXPIRED` response from a protected endpoint triggers automatic retry after refresh (handled in the client's `api.js`).
- Refresh tokens are **rotated** on each use — old token is deleted, new token is issued.
- `POST /api/auth/logout` revokes the current refresh token.

### Protecting a route

```js
const { authenticate } = require('../middleware/auth');

router.get('/my-route', authenticate, async (req, res) => {
  // req.userId is the authenticated user's UUID
});
```

### OAuth (Google / LinkedIn)

The OAuth strategies are **registered conditionally** — they activate only when `GOOGLE_CLIENT_ID` / `LINKEDIN_CLIENT_ID` are present in the environment. This allows the rest of the app to run without OAuth credentials configured.

After a successful OAuth callback, the user is redirected to:
```
{CLIENT_URL}/oauth-callback?token=<accessToken>
```

The client reads the token from the query string and stores it.

---

## Scripts

| Script            | Description                                     |
|-------------------|-------------------------------------------------|
| `npm run dev`     | Start with nodemon (auto-restart on file change)|
| `npm start`       | Start without nodemon                           |
| `npm run db:migrate` | Run Prisma migrations in dev                 |
| `npm run db:generate` | Regenerate Prisma client after schema change|
| `npm run db:seed` | Run the demo data seeder                        |
| `npm run db:studio` | Open Prisma Studio (database GUI)             |

---

## Rate Limiting

| Scope      | Window    | Max requests |
|------------|-----------|--------------|
| `/api/auth/*` | 15 min | 20           |
| All other `/api/*` | 1 min | 120     |

---

## Error Responses

All errors follow a consistent shape:

```json
{ "error": "Human-readable message" }
```

| HTTP Code | When                                          |
|-----------|-----------------------------------------------|
| `401`     | Missing / invalid / expired token             |
| `404`     | Record not found or belongs to another user   |
| `409`     | Unique constraint violation (e.g. duplicate email) |
| `422`     | Validation errors (returns `{ "errors": [...] }`) |
| `429`     | Rate limit exceeded                           |
| `500`     | Unexpected server error                       |

---

## Database Management

```bash
# View / edit data in a GUI
npm run db:studio

# Create a new migration after editing schema.prisma
npx prisma migrate dev --name describe_the_change

# Reset database (drops all data and re-runs migrations + seed)
npx prisma migrate reset
```

---

## Environment Variables Reference

| Variable               | Required | Default       | Description                        |
|------------------------|----------|---------------|------------------------------------|
| `DATABASE_URL`         | ✓        | —             | PostgreSQL connection string       |
| `JWT_SECRET`           | ✓        | —             | Secret for signing access tokens   |
| `JWT_EXPIRES_IN`       |          | `15m`         | Access token TTL                   |
| `REFRESH_SECRET`       | ✓        | —             | Secret key (currently unused — tokens are opaque UUIDs, but kept for future HMAC signing) |
| `REFRESH_EXPIRES_IN`   |          | `7d`          | Refresh token TTL                  |
| `GOOGLE_CLIENT_ID`     |          | —             | Enables Google OAuth when set      |
| `GOOGLE_CLIENT_SECRET` |          | —             | Google OAuth secret                |
| `LINKEDIN_CLIENT_ID`   |          | —             | Enables LinkedIn OAuth when set    |
| `LINKEDIN_CLIENT_SECRET`|         | —             | LinkedIn OAuth secret              |
| `CLIENT_URL`           |          | `http://localhost:3000` | CORS allowed origin & OAuth redirect base |
| `PORT`                 |          | `4000`        | HTTP port                          |
| `NODE_ENV`             |          | `development` | `production` enables Secure cookies|
