import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { InvalidTransitionError } from "../services/deliveryStateMachine";

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Помилка валідації даних", details: err.flatten() });
  }
  if (err instanceof InvalidTransitionError) {
    return res.status(409).json({ error: err.message });
  }
  if (err instanceof Error && err.name === "NotFoundError") {
    return res.status(404).json({ error: err.message });
  }
  if (err instanceof Error && err.name === "ForbiddenError") {
    return res.status(403).json({ error: err.message });
  }

  console.error(err);
  return res.status(500).json({ error: "Внутрішня помилка сервера" });
}

export function notFound(message: string): Error {
  const err = new Error(message);
  err.name = "NotFoundError";
  return err;
}

export function forbidden(message: string): Error {
  const err = new Error(message);
  err.name = "ForbiddenError";
  return err;
}
