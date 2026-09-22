import "dotenv/config";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var ${name}`);
  return v;
}

export const env = {
  port: parseInt(process.env.PORT ?? "4000", 10),
  jwtSecret: required("JWT_SECRET", "dev-secret-do-not-use-in-prod"),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  avgSpeedKmh: parseFloat(process.env.AVG_SPEED_KMH ?? "28"),
  stopHandlingMinutes: parseFloat(process.env.STOP_HANDLING_MINUTES ?? "5"),
};
