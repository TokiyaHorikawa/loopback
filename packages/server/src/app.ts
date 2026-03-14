import { Hono } from "hono";
import goalsRoute from "./routes/goals.js";

export const app = new Hono();

app.get("/api/health", (c) => {
  return c.json({ status: "ok" });
});

app.route("/api/goals", goalsRoute);
