import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
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

// WebSocket events
io.on("connection", (socket) => {
  console.log("A user connected");

  // Handle any events you want here
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});
// export default app
export { server, io };
