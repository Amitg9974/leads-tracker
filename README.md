# Leads Tracking App (API + Web)

A small web portal for managing sales leads and their notes.

- **Backend:** Node.js + Express, SQLite (`better-sqlite3`)
- **Frontend:** React + TypeScript (Vite, React Router)
- **Tests:** Jest + Supertest (23 API tests)
- **Extras:** Basic auth, pagination, status filter, toast messages, confirm dialog, live form validation, Dockerfile, seed script

## Quick start

Requires Node.js 18.11+ (Node 20 recommended).

```bash
npm install        # installs root, server and client dependencies
npm run seed       # optional: adds 5 sample leads (or use the "New lead" form)
npm run dev        # API on :4000, web app on :5173
```

Open http://localhost:5173. The browser asks for a username and password the first time
(see **Authentication** below).

## Authentication (Basic auth)

All `/api/*` routes are protected with HTTP Basic auth. Default credentials:

| Username | Password |
| --- | --- |
| `admin` | `admin123` |

- In the browser, the built-in sign-in prompt appears the first time the app loads data; the browser then remembers it for the session.
- With curl, add `-u admin:admin123` (all examples below do).
- Without valid credentials the API returns `401` with a `WWW-Authenticate` header.
- Change the credentials with the `BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD` environment variables.

| Script | What it does |
| --- | --- |
| `npm run dev` | Runs API (auto-restart) and Vite dev server together |
| `npm run seed` | Seeds sample data if the DB is empty (`-- --reset` wipes first) |
| `npm test` | Runs the Jest API tests (in-memory SQLite) |
| `npm run build` | Builds the React app to `client/dist` |
| `npm start` | Runs the API; if `client/dist` exists it also serves the web app on :4000 |

Environment variables (all optional): `PORT` (default `4000`), `DB_PATH` (default `server/data/leads.db`), `BASIC_AUTH_USER` (default `admin`), `BASIC_AUTH_PASSWORD` (default `admin123`).

## Project structure

```
server/
  src/
    app.js                  Express app factory (createApp(db))
    server.js               Starts the HTTP server
    db.js                   SQLite connection + schema
    seed.js                 Sample data
    routes/                 URL -> controller wiring
    controllers/            HTTP layer (status codes, 404s)
    repositories/           All SQL lives here
    middleware/             Basic auth + central error handler
    utils/                  Validation + HttpError
  tests/leads.test.js
client/
  src/
    api.ts                  Typed fetch wrapper
    pages/                  LeadsPage, LeadDetailPage, CreateLeadPage
    components/, hooks/, types.ts, utils.ts, styles.css
Dockerfile
```

## Data model

```
leads (id PK, name, email UNIQUE NOCASE, phone NULL, status CHECK in
       new|contacted|qualified|lost, createdAt)
notes (id PK, leadId FK -> leads.id ON DELETE CASCADE, content, createdAt)
```

One lead has many notes. Deleting a lead deletes its notes.

## API

| Method | Path | Success | Errors |
| --- | --- | --- | --- |
| GET | `/api/leads?search=&status=&page=&limit=` | 200 `{ data, pagination }` | 400 bad filter/page |
| POST | `/api/leads` | 201 lead (+ `Location` header) | 400 validation, 409 duplicate email |
| GET | `/api/leads/:id` | 200 lead | 400 bad id, 404 |
| PATCH | `/api/leads/:id` | 200 updated lead | 400, 404, 409 |
| DELETE | `/api/leads/:id` | 204 | 400, 404 |
| GET | `/api/leads/:id/notes` | 200 array (newest first, `[]` if none) | 404 |
| POST | `/api/leads/:id/notes` | 201 note | 400 empty content, 404 |

- `search` matches name or email (case-insensitive, partial). `page` defaults to 1, `limit` to 10 (max 100).
- `name` and `email` are required; `email` must be valid and is unique; `phone` is optional; `status` defaults to `new`.
- Every error has the same shape: `{ "error": { "message": "...", "details": { "field": "..." } } }`.

### curl examples

> The examples use macOS/Linux/Git Bash quoting. In Windows **cmd**, wrap the JSON in double quotes and escape the inner ones, e.g.
> `curl -u admin:admin123 -X POST http://localhost:4000/api/leads -H "Content-Type: application/json" -d "{\"name\":\"Asha Patel\",\"email\":\"asha@example.com\"}"`

```bash
# Create a lead
curl -u admin:admin123 -i -X POST http://localhost:4000/api/leads \
  -H "Content-Type: application/json" \
  -d '{"name":"Asha Patel","email":"asha@example.com","phone":"+91 98765 43210"}'

# List, search and filter (paginated)
curl -u admin:admin123 "http://localhost:4000/api/leads"
curl -u admin:admin123 "http://localhost:4000/api/leads?search=asha&status=new&page=1&limit=10"

# Get one lead
curl -u admin:admin123 http://localhost:4000/api/leads/1

# Update (partial)
curl -u admin:admin123 -X PATCH http://localhost:4000/api/leads/1 \
  -H "Content-Type: application/json" -d '{"status":"contacted"}'
curl -u admin:admin123 -X PATCH http://localhost:4000/api/leads/1 \
  -H "Content-Type: application/json" -d '{"name":"Asha P.","email":"asha.p@example.com"}'

# Add and list notes
curl -u admin:admin123 -X POST http://localhost:4000/api/leads/1/notes \
  -H "Content-Type: application/json" -d '{"content":"Called, wants a demo."}'
curl -u admin:admin123 http://localhost:4000/api/leads/1/notes

# Delete a lead (and its notes)
curl -u admin:admin123 -i -X DELETE http://localhost:4000/api/leads/1

# Validation error (400) and missing lead (404)
curl -u admin:admin123 -i -X POST http://localhost:4000/api/leads -H "Content-Type: application/json" \
  -d '{"name":"","email":"nope"}'
curl -u admin:admin123 -i http://localhost:4000/api/leads/999
```

## Docker

```bash
docker build -t leads-tracker .
docker run -p 4000:4000 -v leads-data:/data \
  -e BASIC_AUTH_USER=admin -e BASIC_AUTH_PASSWORD=admin123 leads-tracker
```

The container serves both the API and the built web app at http://localhost:4000.

## Design notes

- Layers are kept separate: routes -> controllers -> repositories, with validation in one module and a single error handler.
- SQL is parameterised; `LIKE` wildcards in search text are escaped.
- `createApp(db)` takes the database as an argument, so tests run against a fresh in-memory DB.
- Foreign keys are enabled (`PRAGMA foreign_keys = ON`) so the notes cascade works.
- The UI validates on the client for quick feedback, and also shows the server's field errors.
