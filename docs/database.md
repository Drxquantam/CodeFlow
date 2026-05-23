# CodeFlow Database

CodeFlow stores submission history in PostgreSQL.

## Required environment

```env
DATABASE_URL=postgres://user:password@host:5432/codeflow
```

The app creates the `submissions` table automatically on first API use.

## Current ownership model

Until auth is added, each browser gets a persistent anonymous `sessionId`.
Submissions are stored against that `sessionId`, which makes the current UI real and database-backed while keeping a clean path to attach submissions to user accounts later.
