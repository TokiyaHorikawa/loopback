import { Hono } from "hono";
import { getDb, reviews, review_goals } from "@loopback/db";
import { desc, eq } from "drizzle-orm";

const app = new Hono();

function getGoalIds(db: ReturnType<typeof getDb>, reviewId: number): number[] {
  return db
    .select({ goal_id: review_goals.goal_id })
    .from(review_goals)
    .where(eq(review_goals.review_id, reviewId))
    .all()
    .map((r) => r.goal_id);
}

app.get("/", (c) => {
  const db = getDb();
  const rows = db.select().from(reviews).orderBy(desc(reviews.id)).all();
  const result = rows.map((row) => ({
    ...row,
    goal_ids: getGoalIds(db, row.id),
  }));
  return c.json(result);
});

app.get("/:id", (c) => {
  const db = getDb();
  const id = Number(c.req.param("id"));
  const row = db.select().from(reviews).where(eq(reviews.id, id)).get();
  if (!row) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.json({ ...row, goal_ids: getGoalIds(db, row.id) });
});

type ReviewType = "interim" | "final";

interface ReviewInput {
  type: ReviewType;
  content: string;
  date: string;
  goal_ids: number[];
}

function validateReviewBody(
  body: Record<string, unknown>,
): { data: ReviewInput } | { error: string } {
  const { type, content, date } = body;

  if (!type || !content || !date) {
    return { error: "type, content, date are required" };
  }

  if (type !== "interim" && type !== "final") {
    return { error: "type must be 'interim' or 'final'" };
  }

  const goalIds = (body.goal_ids as number[] | undefined) ?? [];

  if (type === "final" && goalIds.length !== 1) {
    return { error: "final review requires exactly 1 goal_id" };
  }

  return {
    data: {
      type,
      content: content as string,
      date: date as string,
      goal_ids: goalIds,
    },
  };
}

app.post("/", async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const validated = validateReviewBody(body);
  if ("error" in validated) {
    return c.json({ error: validated.error }, 400);
  }

  const { type, content, date, goal_ids: goalIds } = validated.data;

  const db = getDb();
  const result = db.insert(reviews).values({ type, content, date }).returning().get();

  for (const goalId of goalIds) {
    db.insert(review_goals).values({ review_id: result.id, goal_id: goalId }).run();
  }

  return c.json({ ...result, goal_ids: goalIds }, 201);
});

export default app;
