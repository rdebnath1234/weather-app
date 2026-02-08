import express from "express";
import { body, param } from "express-validator";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validate.js";
import { normalizeCity } from "../utils/sanitize.js";

const router = express.Router();

router.get("/history", requireAuth, async (req, res, next) => {
  try {
    res.set("Cache-Control", "no-store");
    const user = await User.findById(req.user.id).select("history");
    return res.json({ history: user?.history || [] });
  } catch (err) {
    return next(err);
  }
});

router.get("/favorites", requireAuth, async (req, res, next) => {
  try {
    res.set("Cache-Control", "no-store");
    const user = await User.findById(req.user.id).select("favorites");
    return res.json({ favorites: user?.favorites || [] });
  } catch (err) {
    return next(err);
  }
});

router.post(
  "/favorites",
  requireAuth,
  [
    body("city")
      .trim()
      .notEmpty()
      .withMessage("City is required")
      .isLength({ min: 2, max: 100 })
      .withMessage("City must be between 2 and 100 characters"),
    body("country")
      .optional()
      .trim()
      .isLength({ min: 2, max: 56 })
      .withMessage("Country must be between 2 and 56 characters"),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const city = normalizeCity(req.body.city);
      const country = req.body.country ? String(req.body.country).trim() : "";
      if (!city) {
        return res.status(400).json({ message: "City is required" });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const exists = user.favorites.some((fav) => {
        const sameCity = fav.city.toLowerCase() === city.toLowerCase();
        const sameCountry = (fav.country || "").toLowerCase() === country.toLowerCase();
        return sameCity && sameCountry;
      });
      if (exists) {
        return res.status(409).json({ message: "City already in favorites" });
      }

      user.favorites.push({ city, country, lastSearchedAt: new Date() });
      await user.save();

      return res.status(201).json({ favorites: user.favorites });
    } catch (err) {
      return next(err);
    }
  }
);

router.delete(
  "/favorites/:id",
  requireAuth,
  [param("id").isMongoId().withMessage("Invalid favorite id")],
  validateRequest,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const favorite = user.favorites.id(req.params.id);
      if (!favorite) {
        return res.status(404).json({ message: "Favorite not found" });
      }

      favorite.deleteOne();
      await user.save();

      return res.json({ favorites: user.favorites });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
