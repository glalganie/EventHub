const express = require("express");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const authRouter = require("./routes/auth");
const eventsRouter = require("./routes/events");
const registrationsRouter = require("./routes/registrations");
const notificationsRouter = require("./routes/notifications");
const reportsRouter = require("./routes/reports");
const adminRouter = require("./routes/admin");
const { subscribeEvent, subscribeUser } = require("./realtime/sse");
const messagesRouter = require("./routes/messages");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRouter);
app.use("/events", eventsRouter);
app.use("/events/:id/registrations", registrationsRouter);
app.use("/events/:id/messages", messagesRouter);
app.use("/notifications", notificationsRouter);
app.use("/reports", reportsRouter);
app.use("/admin", adminRouter);

app.get("/realtime/events/:id", subscribeEvent);
app.get("/realtime/users/:id", subscribeUser);

const staticDir = path.join(__dirname, "..", "public");
app.use(express.static(staticDir));
app.get("/", (_req, res) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

app.get("/api-docs", (_req, res) => {
  res.json({
    name: "EventHub API",
    version: "1.0",
    endpoints: [
      { method: "POST", path: "/auth/signup", role: "public" },
      { method: "POST", path: "/auth/login", role: "public" },
      { method: "POST", path: "/auth/logout", role: "user" },
      { method: "POST", path: "/auth/password-reset/request", role: "public" },
      { method: "POST", path: "/auth/password-reset/confirm", role: "public" },
      { method: "POST", path: "/auth/verify/request", role: "public" },
      { method: "POST", path: "/auth/verify/confirm", role: "public" },
      { method: "POST", path: "/auth/oauth/google", role: "public" },
      { method: "POST", path: "/auth/oauth/github", role: "public" },

      { method: "GET", path: "/events", role: "public", query: ["q","category","city","dateFrom","dateTo"] },
      { method: "GET", path: "/events/mine", role: "user" },
      { method: "GET", path: "/events/subscribed", role: "user" },
      { method: "GET", path: "/events/:id", role: "public" },
      { method: "POST", path: "/events", role: "user" },
      { method: "PUT", path: "/events/:id", role: "owner" },
      { method: "DELETE", path: "/events/:id", role: "owner" },

      { method: "GET", path: "/events/:id/messages", role: "owner_or_participant" },
      { method: "POST", path: "/events/:id/messages", role: "owner_or_participant" },

      { method: "POST", path: "/events/:id/registrations", role: "user" },
      { method: "GET", path: "/events/:id/registrations", role: "owner" },
      { method: "DELETE", path: "/events/:id/registrations/me", role: "user" },

      { method: "GET", path: "/notifications", role: "user" },
      { method: "PUT", path: "/notifications/:id/read", role: "user" },
      { method: "PUT", path: "/notifications/read-all", role: "user" },

      { method: "POST", path: "/reports", role: "user" },

      { method: "GET", path: "/admin/users", role: "admin" },
      { method: "GET", path: "/admin/events", role: "admin" },
      { method: "GET", path: "/admin/reports", role: "admin" },
      { method: "PUT", path: "/admin/users/:id/role", role: "admin" },
      { method: "PUT", path: "/admin/users/:id/block", role: "admin" },
      { method: "PUT", path: "/admin/events/:id/moderate", role: "admin" },
      { method: "PUT", path: "/admin/reports/:id/status", role: "admin" },

      { method: "GET", path: "/realtime/events/:id", role: "owner_or_participant", query: ["token"] },
      { method: "GET", path: "/realtime/users/:id", role: "user_or_admin", query: ["token"] }
    ]
  });
});

module.exports = app;
