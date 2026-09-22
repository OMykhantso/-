import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

export const addressesRouter = Router();
addressesRouter.use(requireAuth);

const addressSchema = z.object({
  label: z.string().min(1),
  street: z.string().min(1),
  city: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
});

addressesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = addressSchema.parse(req.body);
    const address = await prisma.address.create({
      data: { ...body, ownerId: req.user!.sub },
    });
    res.status(201).json(address);
  })
);

addressesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const addresses = await prisma.address.findMany({
      where: { ownerId: req.user!.sub },
      orderBy: { label: "asc" },
    });
    res.json(addresses);
  })
);
