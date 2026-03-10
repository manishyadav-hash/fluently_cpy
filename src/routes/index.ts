import { Router } from "express";
import { authRouter } from "./auth.routes";
import { userRouter } from "./user.routes";

export const router = Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
