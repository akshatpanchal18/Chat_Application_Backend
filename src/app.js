import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [process.env.SOCKET_URL],
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.CORS_ORIGIN.split(",").map((url) =>
        url.trim()
      );
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error(`CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "5mb" }));

app.use(express.urlencoded({ extended: true, limit: "5mb" }));

app.use(cookieParser());

//Routes
import AuthRouter from "./routes/auth.route.js";
import UserRouter from "./routes/user.route.js";
import ChatRouter from "./routes/chat.route.js";
import NotificationRouter from "./routes/notification.route.js";
import MessageRouter from "./routes/message.route.js";
import SocketHandler from "./socketHandler.js";

app.use("/api/v1/auth", AuthRouter);
app.use("/api/v1/user", UserRouter);
app.use("/api/v1/chat", ChatRouter);
app.use("/api/v1/notification", NotificationRouter);
app.use("/api/v1/message", MessageRouter);

// WebSocket events

io.on("connection", (socket) => {
  console.log("⭕ User connected:", socket.id);
  SocketHandler(socket);
});

// export default app
export { server, io };
