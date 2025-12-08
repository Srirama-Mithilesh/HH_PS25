import express from "express";
import { addReview } from "../controllers/reviews.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/:hotelId/reviews", authenticateToken, addReview);
//router.post("/:hotelId/reviews", addReview);

export default router;