import { describe, expect, it, vi, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@loopback/db";

vi.mock("@loopback/db", async () => {
  const actual = await vi.importActual<typeof import("@loopback/db")>("@loopback/db");
  return {
    ...actual,
    getDb: vi.fn(),
  };
});

import { app } from "../app.js";

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE goals (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      type text NOT NULL,
      content text NOT NULL,
      start_date text NOT NULL,
      end_date text NOT NULL,
      created_at text DEFAULT (datetime('now')) NOT NULL
    );
  `);
  return drizzle(sqlite, { schema });
}

let testDb: ReturnType<typeof createTestDb>;

beforeEach(() => {
  testDb = createTestDb();
  vi.mocked(schema.getDb).mockReturnValue(testDb as any);
});

describe("POST /api/goals", () => {
  it("creates a new goal", async () => {
    const res = await app.request("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "quarterly",
        content: "TypeScriptの理解を深める",
        start_date: "2026-01-01",
        end_date: "2026-03-31",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(1);
    expect(body.type).toBe("quarterly");
    expect(body.content).toBe("TypeScriptの理解を深める");
    expect(body.start_date).toBe("2026-01-01");
    expect(body.end_date).toBe("2026-03-31");
    expect(body.created_at).toBeDefined();
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await app.request("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "annual" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const res = await app.request("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON");
  });

  it("returns 400 for invalid type", async () => {
    const res = await app.request("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "monthly",
        content: "test",
        start_date: "2026-01-01",
        end_date: "2026-03-31",
      }),
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/goals", () => {
  it("returns empty array when no goals exist", async () => {
    const res = await app.request("/api/goals");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns goals ordered by id desc", async () => {
    // Insert two goals
    await app.request("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "annual",
        content: "First goal",
        start_date: "2026-01-01",
        end_date: "2026-12-31",
      }),
    });
    await app.request("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "quarterly",
        content: "Second goal",
        start_date: "2026-04-01",
        end_date: "2026-06-30",
      }),
    });

    const res = await app.request("/api/goals");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].content).toBe("Second goal");
    expect(body[1].content).toBe("First goal");
  });
});
