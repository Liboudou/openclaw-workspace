# TaskFlow Dashboard — Design Spec

## Purpose

A task management dashboard where users can create, assign, track, and manage tasks with priorities, deadlines, and modification history. Deployed from the existing GitHub repo (`Liboudou`).

## Existing Assets

- `projects/TaskFlow_Dashboard/schema.sql` — PostgreSQL schema with:
  - `utilisateurs` (id, nom, email, date_creation)
  - `taches` (id, titre, description, statut, priorite, deadline, utilisateur_id, timestamps)
  - `logs_modifications` (id, tache_id, action, utilisateur_id, date_action, details JSONB)
  - Indexes on statut, priorite+deadline, logs tache_id
  - Auto-update trigger on `date_modification`

## Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | Node.js + Express | Already in repo ecosystem (package.json exists), lightweight REST |
| Database | PostgreSQL | Schema already defined, JSONB for logs, triggers |
| Frontend | React (Vite) | Fast dev, component model fits dashboard UI |
| Styling | TailwindCSS | Rapid prototyping, no CSS files to manage |
| Tests | Vitest | Fast, Vite-native, covers unit + integration |
| CI | GitHub Actions | Standard for GitHub repos |

## Architecture

```
projects/TaskFlow_Dashboard/
├── server/
│   ├── index.js          # Express app entry
│   ├── db.js             # pg Pool connection
│   ├── routes/
│   │   ├── users.js      # CRUD /api/users
│   │   └── tasks.js      # CRUD /api/tasks (+ logs)
│   └── middleware/
│       └── validate.js   # Input validation
├── client/
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Dashboard.jsx    # Stats overview
│   │   │   ├── TaskList.jsx     # Filterable task list
│   │   │   ├── TaskForm.jsx     # Create/edit task
│   │   │   ├── TaskCard.jsx     # Single task display
│   │   │   └── UserSelect.jsx   # User picker
│   │   └── api.js               # Fetch wrapper
│   ├── tailwind.config.js
│   └── vite.config.js
├── schema.sql
├── seed.sql
├── package.json
├── vitest.config.js
└── README.md
```

## API Endpoints

### Users
- `GET /api/users` — list all users
- `POST /api/users` — create user (nom, email)
- `GET /api/users/:id` — get user by id

### Tasks
- `GET /api/tasks` — list tasks (query params: statut, priorite, utilisateur_id)
- `POST /api/tasks` — create task
- `GET /api/tasks/:id` — get task with logs
- `PUT /api/tasks/:id` — update task (auto-logs change)
- `DELETE /api/tasks/:id` — delete task

### Logs
- `GET /api/tasks/:id/logs` — modification history for a task

## Data Flow

1. User interacts with React UI (create/edit/filter tasks)
2. React calls Express REST API via fetch
3. Express validates input, queries PostgreSQL
4. On task update: INSERT into `logs_modifications` with old/new diff in JSONB `details`
5. Trigger auto-updates `date_modification`
6. Response returns to React, UI re-renders

## Frontend Components

- **Dashboard**: task count by status (en attente / en cours / terminee), overdue count, priority distribution
- **TaskList**: sortable/filterable table, status badges, priority indicators, deadline warnings
- **TaskForm**: modal form for create/edit, user dropdown, date picker, priority selector
- **TaskCard**: compact card view with status, priority color, assignee, deadline

## Error Handling

- Backend: Express error middleware, 400 for validation, 404 for not found, 500 for DB errors
- Frontend: toast notifications for API errors, loading states, empty states

## Testing Strategy

- **Unit**: route handlers with mocked db, validation functions
- **Integration**: API endpoints against test database
- **Component**: React component rendering with mock data (vitest + @testing-library/react)

## Scope Boundaries

- No authentication/login (simple user selection)
- No real-time updates (polling or manual refresh)
- No file attachments
- No comments/discussion on tasks
- Single-project scope (no multi-tenant)
