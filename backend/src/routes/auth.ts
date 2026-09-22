import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { signToken } from "../utils/jwt";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  role: z.nativeEnum(Role),
});

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash,
        phone: body.phone,
        role: body.role,
      },
    });

    const token = signToken({ sub: user.id, role: user.role, email: user.email });
    res.status(201).json({ token, user: toPublicUser(user) });
  })
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken({ sub: user.id, role: user.role, email: user.email });
    res.json({ token, user: toPublicUser(user) });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(toPublicUser(user));
  })
);

function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
  };
}
