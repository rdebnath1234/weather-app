import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body } from "express-validator";
import User from "../models/User.js";
import { validateRequest } from "../middleware/validate.js";

const router = express.Router();

const emailRule = body("email")
  .isEmail()
  .withMessage("A valid email is required")
  .normalizeEmail();

const passwordRule = body("password")
  .isLength({ min: 6 })
  .withMessage("Password must be at least 6 characters long");

router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    emailRule,
    passwordRule,
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { name, email, password } = req.body;
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ message: "Email already registered" });
      }

      const hashed = await bcrypt.hash(password, 12);
      const user = await User.create({ name, email, password: hashed });

      const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      return res.status(201).json({
        token,
        user: { id: user._id, name: user.name, email: user.email },
      });
    } catch (err) {
      return next(err);
    }
  }
);

router.post(
  "/login",
  [emailRule, passwordRule],
  validateRequest,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      return res.json({
        token,
        user: { id: user._id, name: user.name, email: user.email },
      });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
