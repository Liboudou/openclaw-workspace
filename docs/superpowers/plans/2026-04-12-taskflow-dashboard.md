# TaskFlow Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack task management dashboard with Express API + React frontend backed by an existing PostgreSQL schema.

**Architecture:** Monorepo in `projects/TaskFlow_Dashboard/` with `server/` (Express REST API + pg) and `client/` (Vite + React + Tailwind). The PostgreSQL schema already exists in `schema.sql`. API auto-logs task modifications into `logs_modifications`.

**Tech Stack:** Node.js, Express, pg, React 18, Vite, TailwindCSS, Vitest, @testing-library/react

---

## File Structure

```
projects/TaskFlow_Dashboard/
├── package.json              # Root: scripts for dev, build, test
├── vitest.config.js          # Vitest config (server tests)
├── schema.sql                # (existing) PostgreSQL schema
├── seed.sql                  # Sample data for dev
├── server/
│   ├── index.js              # Express app setup + listen
│   ├── app.js                # Express app factory (for testing)
│   ├── db.js                 # pg Pool singleton
│   ├── routes/
│   │   ├── users.js          # /api/users CRUD
│   │   └── tasks.js          # /api/tasks CRUD + /api/tasks/:id/logs
│   └── middleware/
│       └── validate.js       # Request body validation helpers
├── server/__tests__/
│   ├── users.test.js         # Users route tests
│   └── tasks.test.js         # Tasks route tests
├── client/
│   ├── index.html            # Vite HTML entry
│   ├── vite.config.js        # Vite config with API proxy
│   ├── tailwind.config.js    # Tailwind config
│   ├── postcss.config.js     # PostCSS for Tailwind
│   ├── src/
│   │   ├── main.jsx          # React DOM render
│   │   ├── App.jsx           # Root with routing/state
│   │   ├── api.js            # Fetch wrapper
│   │   ├── components/
│   │   │   ├── Dashboard.jsx # Stats overview
│   │   │   ├── TaskList.jsx  # Filterable task table
│   │   │   ├── TaskForm.jsx  # Create/edit modal
│   │   │   ├── TaskCard.jsx  # Single task card
│   │   │   └── UserSelect.jsx# User dropdown
│   │   └── __tests__/
│   │       ├── Dashboard.test.jsx
│   │       ├── TaskList.test.jsx
│   │       └── TaskForm.test.jsx
│   └── vitest.config.js      # Client vitest with jsdom
├── .github/
│   └── workflows/
│       └── ci.yml            # Lint + test CI
└── README.md
```

---

## Task 1: Project Scaffold & Dependencies

**Files:**
- Create: `projects/TaskFlow_Dashboard/package.json`
- Create: `projects/TaskFlow_Dashboard/seed.sql`
- Create: `projects/TaskFlow_Dashboard/.env.example`

- [ ] **Step 1: Initialize package.json**

```bash
cd projects/TaskFlow_Dashboard
npm init -y
```

Then replace `package.json` contents with:

```json
{
  "name": "taskflow-dashboard",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev:server": "node server/index.js",
    "dev:client": "npm run --prefix client dev",
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:client": "npm run --prefix client test",
    "build": "npm run --prefix client build",
    "db:seed": "node -e \"import('./server/db.js').then(async m => { const fs = await import('fs'); const sql = fs.readFileSync('seed.sql','utf8'); await m.default.query(sql); console.log('Seeded'); process.exit(0); })\""
  },
  "dependencies": {
    "express": "^4.21.0",
    "pg": "^8.13.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "concurrently": "^9.1.0",
    "supertest": "^7.0.0"
  }
}
```

- [ ] **Step 2: Install server dependencies**

```bash
cd projects/TaskFlow_Dashboard
npm install
```

- [ ] **Step 3: Create .env.example**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taskflow
PORT=3001
```

- [ ] **Step 4: Create seed.sql**

```sql
-- Seed data for development
INSERT INTO utilisateurs (nom, email) VALUES
  ('Alice Dupont', 'alice@example.com'),
  ('Bob Martin', 'bob@example.com'),
  ('Claire Leroy', 'claire@example.com')
ON CONFLICT (email) DO NOTHING;

INSERT INTO taches (titre, description, statut, priorite, deadline, utilisateur_id) VALUES
  ('Configurer CI/CD', 'Mettre en place GitHub Actions', 'en attente', 2, NOW() + INTERVAL '7 days', 1),
  ('Design maquettes', 'Créer les maquettes Figma du dashboard', 'en cours', 3, NOW() + INTERVAL '3 days', 2),
  ('Écrire tests API', 'Tests unitaires pour les routes Express', 'en attente', 1, NOW() + INTERVAL '5 days', 1),
  ('Revue de code', 'Review PR #12 avant merge', 'terminee', 2, NOW() - INTERVAL '1 day', 3),
  ('Corriger bug filtres', 'Les filtres par priorité ne marchent pas', 'en cours', 3, NOW() + INTERVAL '1 day', 2)
ON CONFLICT DO NOTHING;
```

- [ ] **Step 5: Commit**

```bash
git add projects/TaskFlow_Dashboard/package.json projects/TaskFlow_Dashboard/package-lock.json projects/TaskFlow_Dashboard/seed.sql projects/TaskFlow_Dashboard/.env.example
git commit -m "feat(taskflow): scaffold project with dependencies and seed data"
```

---

## Task 2: Database Connection

**Files:**
- Create: `projects/TaskFlow_Dashboard/server/db.js`

- [ ] **Step 1: Create db.js**

```js
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;
```

- [ ] **Step 2: Commit**

```bash
git add projects/TaskFlow_Dashboard/server/db.js
git commit -m "feat(taskflow): add PostgreSQL connection pool"
```

---

## Task 3: Validation Middleware

**Files:**
- Create: `projects/TaskFlow_Dashboard/server/middleware/validate.js`

- [ ] **Step 1: Create validate.js**

```js
export function validateUser(req, res, next) {
  const { nom, email } = req.body;
  if (!nom || typeof nom !== "string" || nom.trim().length === 0) {
    return res.status(400).json({ error: "nom is required" });
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "valid email is required" });
  }
  next();
}

export function validateTask(req, res, next) {
  const { titre } = req.body;
  if (!titre || typeof titre !== "string" || titre.trim().length === 0) {
    return res.status(400).json({ error: "titre is required" });
  }
  const validStatuts = ["en attente", "en cours", "terminee"];
  if (req.body.statut && !validStatuts.includes(req.body.statut)) {
    return res.status(400).json({ error: "statut must be one of: en attente, en cours, terminee" });
  }
  if (req.body.priorite !== undefined) {
    const p = Number(req.body.priorite);
    if (!Number.isInteger(p) || p < 1 || p > 3) {
      return res.status(400).json({ error: "priorite must be 1, 2, or 3" });
    }
  }
  next();
}
```

- [ ] **Step 2: Commit**

```bash
git add projects/TaskFlow_Dashboard/server/middleware/validate.js
git commit -m "feat(taskflow): add input validation middleware"
```

---

## Task 4: Users Routes (TDD)

**Files:**
- Create: `projects/TaskFlow_Dashboard/server/routes/users.js`
- Create: `projects/TaskFlow_Dashboard/server/app.js`
- Create: `projects/TaskFlow_Dashboard/server/__tests__/users.test.js`
- Create: `projects/TaskFlow_Dashboard/vitest.config.js`

- [ ] **Step 1: Create app.js (Express factory)**

```js
import express from "express";
import cors from "cors";
import usersRouter from "./routes/users.js";

export function createApp(db) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/api/users", usersRouter(db));

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
```

- [ ] **Step 2: Create vitest.config.js**

```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["server/__tests__/**/*.test.js"],
  },
});
```

- [ ] **Step 3: Create stub users route (empty)**

```js
// server/routes/users.js
import { Router } from "express";

export default function usersRouter(db) {
  const router = Router();
  return router;
}
```

- [ ] **Step 4: Write failing tests for users**

```js
// server/__tests__/users.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

function mockDb() {
  return { query: vi.fn() };
}

describe("GET /api/users", () => {
  it("returns list of users", async () => {
    const db = mockDb();
    db.query.mockResolvedValue({ rows: [{ id: 1, nom: "Alice", email: "alice@example.com" }] });
    const app = createApp(db);

    const res = await request(app).get("/api/users");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, nom: "Alice", email: "alice@example.com" }]);
    expect(db.query).toHaveBeenCalledWith("SELECT * FROM utilisateurs ORDER BY id");
  });
});

describe("POST /api/users", () => {
  it("creates a user", async () => {
    const db = mockDb();
    db.query.mockResolvedValue({ rows: [{ id: 2, nom: "Bob", email: "bob@example.com" }] });
    const app = createApp(db);

    const res = await request(app)
      .post("/api/users")
      .send({ nom: "Bob", email: "bob@example.com" });
    expect(res.status).toBe(201);
    expect(res.body.nom).toBe("Bob");
  });

  it("rejects missing nom", async () => {
    const db = mockDb();
    const app = createApp(db);

    const res = await request(app)
      .post("/api/users")
      .send({ email: "bob@example.com" });
    expect(res.status).toBe(400);
  });

  it("rejects invalid email", async () => {
    const db = mockDb();
    const app = createApp(db);

    const res = await request(app)
      .post("/api/users")
      .send({ nom: "Bob", email: "invalid" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/users/:id", () => {
  it("returns a user by id", async () => {
    const db = mockDb();
    db.query.mockResolvedValue({ rows: [{ id: 1, nom: "Alice", email: "alice@example.com" }] });
    const app = createApp(db);

    const res = await request(app).get("/api/users/1");
    expect(res.status).toBe(200);
    expect(res.body.nom).toBe("Alice");
  });

  it("returns 404 for missing user", async () => {
    const db = mockDb();
    db.query.mockResolvedValue({ rows: [] });
    const app = createApp(db);

    const res = await request(app).get("/api/users/999");
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 5: Run tests to verify they fail**

```bash
cd projects/TaskFlow_Dashboard
npx vitest run
```

Expected: FAIL — routes return 404 because no handlers are defined.

- [ ] **Step 6: Implement users route**

Replace `server/routes/users.js`:

```js
import { Router } from "express";
import { validateUser } from "../middleware/validate.js";

export default function usersRouter(db) {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const { rows } = await db.query("SELECT * FROM utilisateurs ORDER BY id");
      res.json(rows);
    } catch (err) { next(err); }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const { rows } = await db.query("SELECT * FROM utilisateurs WHERE id = $1", [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: "User not found" });
      res.json(rows[0]);
    } catch (err) { next(err); }
  });

  router.post("/", validateUser, async (req, res, next) => {
    try {
      const { nom, email } = req.body;
      const { rows } = await db.query(
        "INSERT INTO utilisateurs (nom, email) VALUES ($1, $2) RETURNING *",
        [nom.trim(), email.trim()]
      );
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  });

  return router;
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd projects/TaskFlow_Dashboard
npx vitest run
```

Expected: All 5 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add projects/TaskFlow_Dashboard/server/ projects/TaskFlow_Dashboard/vitest.config.js
git commit -m "feat(taskflow): users CRUD routes with tests"
```

---

## Task 5: Tasks Routes (TDD)

**Files:**
- Create: `projects/TaskFlow_Dashboard/server/routes/tasks.js`
- Create: `projects/TaskFlow_Dashboard/server/__tests__/tasks.test.js`
- Modify: `projects/TaskFlow_Dashboard/server/app.js`

- [ ] **Step 1: Write failing tests for tasks**

```js
// server/__tests__/tasks.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

function mockDb() {
  return { query: vi.fn() };
}

describe("GET /api/tasks", () => {
  it("returns all tasks", async () => {
    const db = mockDb();
    db.query.mockResolvedValue({ rows: [{ id: 1, titre: "Test task" }] });
    const app = createApp(db);

    const res = await request(app).get("/api/tasks");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("filters by statut", async () => {
    const db = mockDb();
    db.query.mockResolvedValue({ rows: [] });
    const app = createApp(db);

    await request(app).get("/api/tasks?statut=en+cours");
    expect(db.query.mock.calls[0][0]).toContain("statut = $");
  });
});

describe("POST /api/tasks", () => {
  it("creates a task", async () => {
    const db = mockDb();
    db.query.mockResolvedValue({ rows: [{ id: 1, titre: "New task", statut: "en attente" }] });
    const app = createApp(db);

    const res = await request(app)
      .post("/api/tasks")
      .send({ titre: "New task" });
    expect(res.status).toBe(201);
    expect(res.body.titre).toBe("New task");
  });

  it("rejects missing titre", async () => {
    const db = mockDb();
    const app = createApp(db);

    const res = await request(app)
      .post("/api/tasks")
      .send({ description: "no title" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/tasks/:id", () => {
  it("returns task by id", async () => {
    const db = mockDb();
    db.query.mockResolvedValue({ rows: [{ id: 1, titre: "Task 1" }] });
    const app = createApp(db);

    const res = await request(app).get("/api/tasks/1");
    expect(res.status).toBe(200);
    expect(res.body.titre).toBe("Task 1");
  });

  it("returns 404 for missing task", async () => {
    const db = mockDb();
    db.query.mockResolvedValue({ rows: [] });
    const app = createApp(db);

    const res = await request(app).get("/api/tasks/999");
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/tasks/:id", () => {
  it("updates a task and logs the change", async () => {
    const db = mockDb();
    // First call: SELECT existing task
    // Second call: UPDATE task
    // Third call: INSERT log
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1, titre: "Old", statut: "en attente", priorite: 1, description: null, deadline: null, utilisateur_id: null }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, titre: "Updated", statut: "en attente" }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const app = createApp(db);

    const res = await request(app)
      .put("/api/tasks/1")
      .send({ titre: "Updated" });
    expect(res.status).toBe(200);
    expect(db.query).toHaveBeenCalledTimes(3);
  });
});

describe("DELETE /api/tasks/:id", () => {
  it("deletes a task", async () => {
    const db = mockDb();
    db.query.mockResolvedValue({ rows: [{ id: 1 }] });
    const app = createApp(db);

    const res = await request(app).delete("/api/tasks/1");
    expect(res.status).toBe(200);
  });

  it("returns 404 for missing task", async () => {
    const db = mockDb();
    db.query.mockResolvedValue({ rows: [] });
    const app = createApp(db);

    const res = await request(app).delete("/api/tasks/999");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/tasks/:id/logs", () => {
  it("returns modification logs", async () => {
    const db = mockDb();
    db.query.mockResolvedValue({ rows: [{ id: 1, action: "update", details: { titre: { old: "A", new: "B" } } }] });
    const app = createApp(db);

    const res = await request(app).get("/api/tasks/1/logs");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd projects/TaskFlow_Dashboard
npx vitest run
```

Expected: Tasks tests FAIL (routes not registered).

- [ ] **Step 3: Create tasks route**

```js
// server/routes/tasks.js
import { Router } from "express";
import { validateTask } from "../middleware/validate.js";

export default function tasksRouter(db) {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const conditions = [];
      const params = [];
      let idx = 1;

      if (req.query.statut) {
        conditions.push(`statut = $${idx++}`);
        params.push(req.query.statut);
      }
      if (req.query.priorite) {
        conditions.push(`priorite = $${idx++}`);
        params.push(Number(req.query.priorite));
      }
      if (req.query.utilisateur_id) {
        conditions.push(`utilisateur_id = $${idx++}`);
        params.push(Number(req.query.utilisateur_id));
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const { rows } = await db.query(
        `SELECT * FROM taches ${where} ORDER BY priorite DESC, deadline ASC`,
        params
      );
      res.json(rows);
    } catch (err) { next(err); }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const { rows } = await db.query("SELECT * FROM taches WHERE id = $1", [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: "Task not found" });
      res.json(rows[0]);
    } catch (err) { next(err); }
  });

  router.post("/", validateTask, async (req, res, next) => {
    try {
      const { titre, description, statut, priorite, deadline, utilisateur_id } = req.body;
      const { rows } = await db.query(
        `INSERT INTO taches (titre, description, statut, priorite, deadline, utilisateur_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [titre.trim(), description || null, statut || "en attente", priorite || 1, deadline || null, utilisateur_id || null]
      );
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  });

  router.put("/:id", async (req, res, next) => {
    try {
      const { rows: existing } = await db.query("SELECT * FROM taches WHERE id = $1", [req.params.id]);
      if (existing.length === 0) return res.status(404).json({ error: "Task not found" });

      const old = existing[0];
      const { titre, description, statut, priorite, deadline, utilisateur_id } = req.body;
      const updated = {
        titre: titre !== undefined ? titre.trim() : old.titre,
        description: description !== undefined ? description : old.description,
        statut: statut !== undefined ? statut : old.statut,
        priorite: priorite !== undefined ? Number(priorite) : old.priorite,
        deadline: deadline !== undefined ? deadline : old.deadline,
        utilisateur_id: utilisateur_id !== undefined ? utilisateur_id : old.utilisateur_id,
      };

      const { rows } = await db.query(
        `UPDATE taches SET titre=$1, description=$2, statut=$3, priorite=$4, deadline=$5, utilisateur_id=$6
         WHERE id=$7 RETURNING *`,
        [updated.titre, updated.description, updated.statut, updated.priorite, updated.deadline, updated.utilisateur_id, req.params.id]
      );

      // Log changes
      const changes = {};
      for (const key of ["titre", "description", "statut", "priorite", "deadline", "utilisateur_id"]) {
        if (String(updated[key]) !== String(old[key])) {
          changes[key] = { old: old[key], new: updated[key] };
        }
      }
      if (Object.keys(changes).length > 0) {
        await db.query(
          `INSERT INTO logs_modifications (tache_id, action, utilisateur_id, details)
           VALUES ($1, 'update', $2, $3)`,
          [req.params.id, req.body.utilisateur_id || old.utilisateur_id, JSON.stringify(changes)]
        );
      }

      res.json(rows[0]);
    } catch (err) { next(err); }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const { rows } = await db.query("DELETE FROM taches WHERE id = $1 RETURNING *", [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: "Task not found" });
      res.json({ message: "Task deleted", task: rows[0] });
    } catch (err) { next(err); }
  });

  router.get("/:id/logs", async (req, res, next) => {
    try {
      const { rows } = await db.query(
        "SELECT * FROM logs_modifications WHERE tache_id = $1 ORDER BY date_action DESC",
        [req.params.id]
      );
      res.json(rows);
    } catch (err) { next(err); }
  });

  return router;
}
```

- [ ] **Step 4: Update app.js to register tasks router**

Replace `server/app.js`:

```js
import express from "express";
import cors from "cors";
import usersRouter from "./routes/users.js";
import tasksRouter from "./routes/tasks.js";

export function createApp(db) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/api/users", usersRouter(db));
  app.use("/api/tasks", tasksRouter(db));

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd projects/TaskFlow_Dashboard
npx vitest run
```

Expected: All tests PASS (users + tasks).

- [ ] **Step 6: Commit**

```bash
git add projects/TaskFlow_Dashboard/server/ projects/TaskFlow_Dashboard/vitest.config.js
git commit -m "feat(taskflow): tasks CRUD routes with auto-logging and tests"
```

---

## Task 6: Express Server Entry Point

**Files:**
- Create: `projects/TaskFlow_Dashboard/server/index.js`

- [ ] **Step 1: Create server entry**

```js
import dotenv from "dotenv";
dotenv.config();

import db from "./db.js";
import { createApp } from "./app.js";

const app = createApp(db);
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`TaskFlow API running on http://localhost:${PORT}`);
});
```

- [ ] **Step 2: Commit**

```bash
git add projects/TaskFlow_Dashboard/server/index.js
git commit -m "feat(taskflow): add Express server entry point"
```

---

## Task 7: Client Scaffold (Vite + React + Tailwind)

**Files:**
- Create: `projects/TaskFlow_Dashboard/client/package.json`
- Create: `projects/TaskFlow_Dashboard/client/index.html`
- Create: `projects/TaskFlow_Dashboard/client/vite.config.js`
- Create: `projects/TaskFlow_Dashboard/client/tailwind.config.js`
- Create: `projects/TaskFlow_Dashboard/client/postcss.config.js`
- Create: `projects/TaskFlow_Dashboard/client/src/main.jsx`
- Create: `projects/TaskFlow_Dashboard/client/src/index.css`

- [ ] **Step 1: Create client/package.json**

```json
{
  "name": "taskflow-client",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "vitest": "^2.1.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.6.0",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 2: Install client dependencies**

```bash
cd projects/TaskFlow_Dashboard/client
npm install
```

- [ ] **Step 3: Create vite.config.js**

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
```

- [ ] **Step 4: Create tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

- [ ] **Step 5: Create postcss.config.js**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Create index.html**

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TaskFlow Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 8: Create src/main.jsx**

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 9: Create client/vitest.config.js**

```js
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx}"],
    setupFiles: [],
  },
});
```

- [ ] **Step 10: Commit**

```bash
git add projects/TaskFlow_Dashboard/client/
git commit -m "feat(taskflow): scaffold React client with Vite + Tailwind"
```

---

## Task 8: API Fetch Wrapper

**Files:**
- Create: `projects/TaskFlow_Dashboard/client/src/api.js`

- [ ] **Step 1: Create api.js**

```js
const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  getUsers: () => request("/users"),
  getUser: (id) => request(`/users/${id}`),
  createUser: (data) => request("/users", { method: "POST", body: JSON.stringify(data) }),

  getTasks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/tasks${qs ? `?${qs}` : ""}`);
  },
  getTask: (id) => request(`/tasks/${id}`),
  createTask: (data) => request("/tasks", { method: "POST", body: JSON.stringify(data) }),
  updateTask: (id, data) => request(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
  getTaskLogs: (id) => request(`/tasks/${id}/logs`),
};
```

- [ ] **Step 2: Commit**

```bash
git add projects/TaskFlow_Dashboard/client/src/api.js
git commit -m "feat(taskflow): add API fetch wrapper"
```

---

## Task 9: UserSelect Component

**Files:**
- Create: `projects/TaskFlow_Dashboard/client/src/components/UserSelect.jsx`

- [ ] **Step 1: Create UserSelect**

```jsx
import { useState, useEffect } from "react";
import { api } from "../api.js";

export default function UserSelect({ value, onChange }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.getUsers().then(setUsers).catch(console.error);
  }, []);

  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      className="border rounded px-2 py-1 text-sm"
    >
      <option value="">-- Tous --</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>{u.nom}</option>
      ))}
    </select>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add projects/TaskFlow_Dashboard/client/src/components/UserSelect.jsx
git commit -m "feat(taskflow): add UserSelect component"
```

---

## Task 10: TaskCard Component

**Files:**
- Create: `projects/TaskFlow_Dashboard/client/src/components/TaskCard.jsx`

- [ ] **Step 1: Create TaskCard**

```jsx
const priorityColors = {
  1: "bg-gray-100 text-gray-700",
  2: "bg-yellow-100 text-yellow-800",
  3: "bg-red-100 text-red-800",
};

const statutBadges = {
  "en attente": "bg-slate-200 text-slate-700",
  "en cours": "bg-blue-200 text-blue-800",
  "terminee": "bg-green-200 text-green-800",
};

export default function TaskCard({ task, onEdit, onDelete }) {
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.statut !== "terminee";

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${isOverdue ? "border-red-400" : "border-gray-200"}`}>
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-gray-900">{task.titre}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statutBadges[task.statut] || ""}`}>
          {task.statut}
        </span>
      </div>
      {task.description && (
        <p className="mt-1 text-sm text-gray-600">{task.description}</p>
      )}
      <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
        <span className={`px-2 py-0.5 rounded ${priorityColors[task.priorite] || ""}`}>
          P{task.priorite}
        </span>
        {task.deadline && (
          <span className={isOverdue ? "text-red-600 font-medium" : ""}>
            {new Date(task.deadline).toLocaleDateString("fr-FR")}
          </span>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={() => onEdit(task)} className="text-xs text-blue-600 hover:underline">Modifier</button>
        <button onClick={() => onDelete(task.id)} className="text-xs text-red-600 hover:underline">Supprimer</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add projects/TaskFlow_Dashboard/client/src/components/TaskCard.jsx
git commit -m "feat(taskflow): add TaskCard component"
```

---

## Task 11: TaskForm Component

**Files:**
- Create: `projects/TaskFlow_Dashboard/client/src/components/TaskForm.jsx`

- [ ] **Step 1: Create TaskForm**

```jsx
import { useState, useEffect } from "react";
import UserSelect from "./UserSelect.jsx";

export default function TaskForm({ task, onSave, onCancel }) {
  const [form, setForm] = useState({
    titre: "",
    description: "",
    statut: "en attente",
    priorite: 1,
    deadline: "",
    utilisateur_id: null,
  });

  useEffect(() => {
    if (task) {
      setForm({
        titre: task.titre || "",
        description: task.description || "",
        statut: task.statut || "en attente",
        priorite: task.priorite || 1,
        deadline: task.deadline ? task.deadline.slice(0, 16) : "",
        utilisateur_id: task.utilisateur_id,
      });
    }
  }, [task]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, deadline: form.deadline || null });
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-bold">{task ? "Modifier la tâche" : "Nouvelle tâche"}</h2>

        <input
          type="text"
          placeholder="Titre *"
          value={form.titre}
          onChange={(e) => setForm({ ...form, titre: e.target.value })}
          required
          className="w-full border rounded px-3 py-2"
        />

        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full border rounded px-3 py-2"
          rows={3}
        />

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Statut</label>
            <select
              value={form.statut}
              onChange={(e) => setForm({ ...form, statut: e.target.value })}
              className="w-full border rounded px-2 py-1"
            >
              <option value="en attente">En attente</option>
              <option value="en cours">En cours</option>
              <option value="terminee">Terminée</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Priorité</label>
            <select
              value={form.priorite}
              onChange={(e) => setForm({ ...form, priorite: Number(e.target.value) })}
              className="w-full border rounded px-2 py-1"
            >
              <option value={1}>1 - Basse</option>
              <option value={2}>2 - Moyenne</option>
              <option value={3}>3 - Haute</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Deadline</label>
          <input
            type="datetime-local"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Assignée à</label>
          <UserSelect value={form.utilisateur_id} onChange={(v) => setForm({ ...form, utilisateur_id: v })} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">
            Annuler
          </button>
          <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
            {task ? "Sauvegarder" : "Créer"}
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add projects/TaskFlow_Dashboard/client/src/components/TaskForm.jsx
git commit -m "feat(taskflow): add TaskForm modal component"
```

---

## Task 12: TaskList Component

**Files:**
- Create: `projects/TaskFlow_Dashboard/client/src/components/TaskList.jsx`

- [ ] **Step 1: Create TaskList**

```jsx
import { useState } from "react";
import TaskCard from "./TaskCard.jsx";
import UserSelect from "./UserSelect.jsx";

export default function TaskList({ tasks, onEdit, onDelete, onFilter }) {
  const [filters, setFilters] = useState({ statut: "", priorite: "", utilisateur_id: "" });

  const handleFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    const clean = {};
    for (const [k, v] of Object.entries(next)) {
      if (v) clean[k] = v;
    }
    onFilter(clean);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filters.statut}
          onChange={(e) => handleFilter("statut", e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">Tous les statuts</option>
          <option value="en attente">En attente</option>
          <option value="en cours">En cours</option>
          <option value="terminee">Terminée</option>
        </select>

        <select
          value={filters.priorite}
          onChange={(e) => handleFilter("priorite", e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">Toutes priorités</option>
          <option value="1">P1 - Basse</option>
          <option value="2">P2 - Moyenne</option>
          <option value="3">P3 - Haute</option>
        </select>

        <UserSelect
          value={filters.utilisateur_id}
          onChange={(v) => handleFilter("utilisateur_id", v || "")}
        />
      </div>

      {tasks.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Aucune tâche trouvée.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add projects/TaskFlow_Dashboard/client/src/components/TaskList.jsx
git commit -m "feat(taskflow): add TaskList component with filters"
```

---

## Task 13: Dashboard Component

**Files:**
- Create: `projects/TaskFlow_Dashboard/client/src/components/Dashboard.jsx`

- [ ] **Step 1: Create Dashboard**

```jsx
export default function Dashboard({ tasks }) {
  const byStatut = {
    "en attente": tasks.filter((t) => t.statut === "en attente").length,
    "en cours": tasks.filter((t) => t.statut === "en cours").length,
    "terminee": tasks.filter((t) => t.statut === "terminee").length,
  };

  const overdue = tasks.filter(
    (t) => t.deadline && new Date(t.deadline) < new Date() && t.statut !== "terminee"
  ).length;

  const stats = [
    { label: "En attente", value: byStatut["en attente"], color: "bg-slate-100 text-slate-700" },
    { label: "En cours", value: byStatut["en cours"], color: "bg-blue-100 text-blue-700" },
    { label: "Terminées", value: byStatut["terminee"], color: "bg-green-100 text-green-700" },
    { label: "En retard", value: overdue, color: "bg-red-100 text-red-700" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((s) => (
        <div key={s.label} className={`rounded-lg p-4 ${s.color}`}>
          <p className="text-2xl font-bold">{s.value}</p>
          <p className="text-sm">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add projects/TaskFlow_Dashboard/client/src/components/Dashboard.jsx
git commit -m "feat(taskflow): add Dashboard stats component"
```

---

## Task 14: App.jsx — Wire Everything Together

**Files:**
- Create: `projects/TaskFlow_Dashboard/client/src/App.jsx`

- [ ] **Step 1: Create App.jsx**

```jsx
import { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";
import Dashboard from "./components/Dashboard.jsx";
import TaskList from "./components/TaskList.jsx";
import TaskForm from "./components/TaskForm.jsx";

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filters, setFilters] = useState({});

  const loadTasks = useCallback(async (params = filters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTasks(params);
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleSave = async (data) => {
    try {
      if (editingTask) {
        await api.updateTask(editingTask.id, data);
      } else {
        await api.createTask(data);
      }
      setShowForm(false);
      setEditingTask(null);
      loadTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteTask(id);
      loadTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleFilter = (params) => {
    setFilters(params);
    loadTasks(params);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">TaskFlow Dashboard</h1>
        <button
          onClick={() => { setEditingTask(null); setShowForm(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
        >
          + Nouvelle tâche
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <Dashboard tasks={tasks} />

        {loading ? (
          <p className="text-center text-gray-500">Chargement...</p>
        ) : (
          <TaskList
            tasks={tasks}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onFilter={handleFilter}
          />
        )}
      </main>

      {showForm && (
        <TaskForm
          task={editingTask}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingTask(null); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add projects/TaskFlow_Dashboard/client/src/App.jsx
git commit -m "feat(taskflow): wire App with Dashboard, TaskList, and TaskForm"
```

---

## Task 15: Client Tests

**Files:**
- Create: `projects/TaskFlow_Dashboard/client/src/__tests__/Dashboard.test.jsx`
- Create: `projects/TaskFlow_Dashboard/client/src/__tests__/TaskList.test.jsx`
- Create: `projects/TaskFlow_Dashboard/client/src/__tests__/TaskForm.test.jsx`

- [ ] **Step 1: Write Dashboard test**

```jsx
// client/src/__tests__/Dashboard.test.jsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Dashboard from "../components/Dashboard.jsx";

describe("Dashboard", () => {
  it("displays task counts by status", () => {
    const tasks = [
      { id: 1, statut: "en attente", titre: "A" },
      { id: 2, statut: "en cours", titre: "B" },
      { id: 3, statut: "en cours", titre: "C" },
      { id: 4, statut: "terminee", titre: "D" },
    ];
    render(<Dashboard tasks={tasks} />);

    expect(screen.getByText("1")).toBeDefined(); // en attente
    expect(screen.getByText("2")).toBeDefined(); // en cours
  });

  it("counts overdue tasks", () => {
    const tasks = [
      { id: 1, statut: "en cours", titre: "Late", deadline: "2020-01-01" },
      { id: 2, statut: "terminee", titre: "Done", deadline: "2020-01-01" },
    ];
    render(<Dashboard tasks={tasks} />);

    // 1 overdue (en cours + past deadline), not 2 (terminee excluded)
    const retardSection = screen.getByText("En retard");
    expect(retardSection.previousElementSibling.textContent).toBe("1");
  });
});
```

- [ ] **Step 2: Write TaskList test**

```jsx
// client/src/__tests__/TaskList.test.jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TaskList from "../components/TaskList.jsx";

// Mock UserSelect to avoid API calls
vi.mock("../components/UserSelect.jsx", () => ({
  default: ({ value, onChange }) => <select data-testid="user-select" />,
}));

describe("TaskList", () => {
  it("renders task cards", () => {
    const tasks = [
      { id: 1, titre: "Task A", statut: "en attente", priorite: 1 },
      { id: 2, titre: "Task B", statut: "en cours", priorite: 2 },
    ];
    render(<TaskList tasks={tasks} onEdit={vi.fn()} onDelete={vi.fn()} onFilter={vi.fn()} />);

    expect(screen.getByText("Task A")).toBeDefined();
    expect(screen.getByText("Task B")).toBeDefined();
  });

  it("shows empty state", () => {
    render(<TaskList tasks={[]} onEdit={vi.fn()} onDelete={vi.fn()} onFilter={vi.fn()} />);
    expect(screen.getByText("Aucune tâche trouvée.")).toBeDefined();
  });
});
```

- [ ] **Step 3: Write TaskForm test**

```jsx
// client/src/__tests__/TaskForm.test.jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TaskForm from "../components/TaskForm.jsx";

// Mock UserSelect
vi.mock("../components/UserSelect.jsx", () => ({
  default: ({ value, onChange }) => <select data-testid="user-select" />,
}));

describe("TaskForm", () => {
  it("renders create form", () => {
    render(<TaskForm task={null} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Nouvelle tâche")).toBeDefined();
    expect(screen.getByText("Créer")).toBeDefined();
  });

  it("renders edit form with task data", () => {
    const task = { titre: "Existing", description: "Desc", statut: "en cours", priorite: 2, deadline: null, utilisateur_id: null };
    render(<TaskForm task={task} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Modifier la tâche")).toBeDefined();
    expect(screen.getByDisplayValue("Existing")).toBeDefined();
  });

  it("calls onCancel", () => {
    const onCancel = vi.fn();
    render(<TaskForm task={null} onSave={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("Annuler"));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 4: Run client tests**

```bash
cd projects/TaskFlow_Dashboard/client
npx vitest run
```

Expected: All client tests PASS.

- [ ] **Step 5: Commit**

```bash
git add projects/TaskFlow_Dashboard/client/src/__tests__/
git commit -m "test(taskflow): add Dashboard, TaskList, and TaskForm component tests"
```

---

## Task 16: GitHub Actions CI

**Files:**
- Create: `projects/TaskFlow_Dashboard/.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

```yaml
name: TaskFlow CI

on:
  push:
    paths: ["projects/TaskFlow_Dashboard/**"]
  pull_request:
    paths: ["projects/TaskFlow_Dashboard/**"]

jobs:
  test-server:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: projects/TaskFlow_Dashboard
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npx vitest run

  test-client:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: projects/TaskFlow_Dashboard/client
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npx vitest run

  build-client:
    runs-on: ubuntu-latest
    needs: [test-client]
    defaults:
      run:
        working-directory: projects/TaskFlow_Dashboard/client
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run build
```

- [ ] **Step 2: Commit**

```bash
git add projects/TaskFlow_Dashboard/.github/
git commit -m "ci(taskflow): add GitHub Actions workflow for tests and build"
```

---

## Task 17: README

**Files:**
- Create: `projects/TaskFlow_Dashboard/README.md`

- [ ] **Step 1: Create README**

```markdown
# TaskFlow Dashboard

Task management dashboard with Express API + React frontend.

## Stack

- **Backend:** Node.js, Express, PostgreSQL
- **Frontend:** React 18, Vite, TailwindCSS
- **Tests:** Vitest, Supertest, Testing Library

## Setup

### Prerequisites
- Node.js 20+
- PostgreSQL running locally

### Database
```bash
createdb taskflow
psql taskflow < schema.sql
psql taskflow < seed.sql
```

### Server
```bash
cp .env.example .env
# Edit .env with your DATABASE_URL
npm install
npm run dev:server
```

### Client
```bash
cd client
npm install
npm run dev
```

### Both (concurrent)
```bash
npm run dev
```

## Tests

```bash
# Server tests
npm test

# Client tests
cd client && npm test
```

## API

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | /api/users | List users |
| POST | /api/users | Create user |
| GET | /api/users/:id | Get user |
| GET | /api/tasks | List tasks (filter: statut, priorite, utilisateur_id) |
| POST | /api/tasks | Create task |
| GET | /api/tasks/:id | Get task |
| PUT | /api/tasks/:id | Update task (auto-logs changes) |
| DELETE | /api/tasks/:id | Delete task |
| GET | /api/tasks/:id/logs | Task modification history |
```

- [ ] **Step 2: Commit**

```bash
git add projects/TaskFlow_Dashboard/README.md
git commit -m "docs(taskflow): add README with setup and API reference"
```

---

## Summary

| Task | What | Tests |
|------|------|-------|
| 1 | Project scaffold + deps + seed | - |
| 2 | DB connection pool | - |
| 3 | Validation middleware | - |
| 4 | Users routes | 5 tests |
| 5 | Tasks routes + auto-logging | 8 tests |
| 6 | Server entry point | - |
| 7 | Client scaffold (Vite+React+Tailwind) | - |
| 8 | API fetch wrapper | - |
| 9 | UserSelect component | - |
| 10 | TaskCard component | - |
| 11 | TaskForm component | - |
| 12 | TaskList component | - |
| 13 | Dashboard stats component | - |
| 14 | App.jsx wiring | - |
| 15 | Client component tests | 6 tests |
| 16 | GitHub Actions CI | - |
| 17 | README | - |

**Total: 17 tasks, 19 tests, 17 commits**
