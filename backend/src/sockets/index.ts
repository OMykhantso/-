import { Server as HttpServer } from "http";
import { Server as SocketIoServer, Socket } from "socket.io";
import { env } from "../config/env";
import { verifyToken } from "../utils/jwt";

let io: SocketIoServer | undefined;

export function initSockets(httpServer: HttpServer): SocketIoServer {
  io = new SocketIoServer(httpServer, {
    cors: { origin: env.corsOrigin, credentials: true },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Missing auth token"));
    try {
      const payload = verifyToken(token);
      socket.data.user = payload;
      next();
    } catch {
      next(new Error("Invalid auth token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as { sub: string; role: string };
    socket.join(`user:${user.sub}`);
    socket.join(`role:${user.role}`);

    socket.on("delivery:watch", (deliveryId: string) => {
      if (typeof deliveryId === "string") socket.join(`delivery:${deliveryId}`);
    });

    socket.on("delivery:unwatch", (deliveryId: string) => {
      if (typeof deliveryId === "string") socket.leave(`delivery:${deliveryId}`);
    });
  });

  return io;
}

export function getIo(): SocketIoServer {
  if (!io) throw new Error("Sockets not initialized yet");
  return io;
}

export function emitToDispatchers(event: string, payload: unknown) {
  getIo().to("role:DISPATCHER").emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  getIo().to(`user:${userId}`).emit(event, payload);
}

export function emitToDelivery(deliveryId: string, event: string, payload: unknown) {
  getIo().to(`delivery:${deliveryId}`).emit(event, payload);
}
