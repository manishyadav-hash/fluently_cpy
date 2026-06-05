import { Router } from "express";
import { authRouter } from "./auth.routes";
import { chatRouter } from "./chat.routes";
import { contentRouter } from "./content.routes";
import { learningRouter } from "./learning.routes";
import { subscriptionRouter } from "./subscription.routes";
import { settingsRouter } from "./settings.routes";
import { userRouter } from "./user.routes";
import { questionnaireRouter } from "./questionnaire.routes";
import { sendSuccess } from "../utils/response";

export const router = Router();

router.use("/auth", authRouter);
router.use("/chat", chatRouter);
router.use("/content", contentRouter);
router.use(learningRouter);
router.use("/settings", settingsRouter);
router.use("/subscriptions", subscriptionRouter);
router.use("/users", userRouter);
router.use("/onboarding", questionnaireRouter);

router.get("/health", (_req, res) => {
  sendSuccess(res, { status: "ok" });
});
