import { Router } from "express";
import {
  getProfile,
  login,
  register,
  updateProfile,
} from "../controllers/users.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils.js";

export const authRouter = Router();

authRouter.post("/register", asyncHandler(register));
authRouter.post("/login", asyncHandler(login));
authRouter.get("/profile", requireAuth, asyncHandler(getProfile));
authRouter.put("/profile", requireAuth, asyncHandler(updateProfile));
