import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { router } from "./routes";
import { errorHandler } from "./middleware/error-handler";

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "../public")));
app.use("/v1", router);
// Keep `/api` during client rollout; `/v1` is the canonical contract path.
app.use("/api", router);

app.use(errorHandler);

export default app;
