import { createServer } from "http";
import { createApp } from "./app";
import { initSockets } from "./sockets/index";
import { env } from "./config/env";

const app = createApp();
const httpServer = createServer(app);
initSockets(httpServer);

httpServer.listen(env.port, () => {
  console.log(`Delivery backend listening on port ${env.port}`);
});
