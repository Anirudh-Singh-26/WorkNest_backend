import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Server } from "socket.io";

import app from "./app";
import connectDB from "./config/db";
import { setupSocket } from "./sockets/socket";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

setupSocket(io);

app.set("io", io);

connectDB();

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
