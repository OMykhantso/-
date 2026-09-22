import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { Role } from "@prisma/client";

export interface JwtPayload {
  sub: string;
  role: Role;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}
