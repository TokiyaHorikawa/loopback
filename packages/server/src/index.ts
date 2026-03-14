import { serve } from "@hono/node-server";
import { app } from "./app.js";

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Server listening on http://localhost:${info.port}`);
});
