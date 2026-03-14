import { Hono } from "hono";
import { getDb, goals } from "@loopback/db";
import { desc } from "drizzle-orm";

const app = new Hono();

app.get("/", (c) => {
  const db = getDb();
  const rows = db.select().from(goals).orderBy(desc(goals.id)).all();
  return c.json(rows);
});

app.post("/", async (c) => {
  const body = await c.req.json();
  const { type, content, start_date, end_date } = body;

  if (!type || !content || !start_date || !end_date) {
    return c.json(
      { error: "type, content, start_date, end_date are required" },
      400,
    );
  }

  if (type !== "annual" && type !== "quarterly") {
    return c.json(
      { error: "type must be 'annual' or 'quarterly'" },
      400,
    );
  }

  const db = getDb();
  const result = db.insert(goals).values({ type, content, start_date, end_date }).returning().get();
  return c.json(result, 201);
});

export default app;
