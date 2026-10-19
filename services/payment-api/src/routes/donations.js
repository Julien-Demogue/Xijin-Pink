import { Router } from "express";
import {
  createCheckout,
  getHistory,
  getLeaderboard,
  getSummary,
} from "../controllers/donations.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils.js";

export const donationsRouter = Router();

donationsRouter.post("/checkout", optionalAuth, asyncHandler(createCheckout));
donationsRouter.get("/history", requireAuth, asyncHandler(getHistory));
donationsRouter.get("/summary", requireAuth, asyncHandler(getSummary));
donationsRouter.get("/leaderboard", asyncHandler(getLeaderboard));
