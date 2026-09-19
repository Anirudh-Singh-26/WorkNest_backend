import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User";
import Workspace from "../models/Workspace";

const onlineUsers = new Map<string, number>();

const getTokenFromCookie = (socket: Socket) => {
  const cookieHeader = socket.handshake.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  const accessToken = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("accessToken="))
    ?.substring("accessToken=".length);

  return accessToken || null;
};

export const setupSocket = (io: Server) => {
  io.use(async (socket, next) => {
    try {
      const token = getTokenFromCookie(socket);

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET as string,
      ) as {
        userId: string;
        tokenVersion: number;
      };

      const user = await User.findById(decoded.userId).select("-passwordHash");

      if (!user) {
        return next(new Error("User not found"));
      }

      if (decoded.tokenVersion !== user.tokenVersion) {
        return next(new Error("Session expired"));
      }

      socket.data.user = user;

      next();
    } catch (error) {
      return next(new Error("Invalid authentication token"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;

    if (!user) {
      socket.disconnect();
      return;
    }

    const userId = user._id.toString();

    socket.join(`user:${userId}`);

    const currentConnections = onlineUsers.get(userId) || 0;

    onlineUsers.set(userId, currentConnections + 1);

    socket.on("join-workspace", async (workspaceId: string) => {
      try {
        const workspace = await Workspace.findOne({
          _id: workspaceId,
          "members.user": user._id,
        });

        if (!workspace) {
          return;
        }

        socket.join(`workspace:${workspaceId}`);

        io.to(`workspace:${workspaceId}`).emit("user.presence", {
          userId,
          status: "online",
        });
      } catch (error) {
       }
    });

    socket.on("leave-workspace", (workspaceId: string) => {
      socket.leave(`workspace:${workspaceId}`);

      io.to(`workspace:${workspaceId}`).emit("user.presence", {
        userId,
        status: "offline",
      });
    });

    socket.on("disconnecting", () => {
      const connections = onlineUsers.get(userId) || 1;

      if (connections <= 1) {
        onlineUsers.delete(userId);

        for (const room of socket.rooms) {
          if (room.startsWith("workspace:")) {
            io.to(room).emit("user.presence", {
              userId,
              status: "offline",
            });
          }
        }
      } else {
        onlineUsers.set(userId, connections - 1);
      }
    });
  });
};
