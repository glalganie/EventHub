const jwt = require("jsonwebtoken");
const { AppDataSource } = require("../db/data-source");

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return res.status(401).json({ error: "unauthorized" });
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "change_me");
    req.user = decoded;
    const repo = AppDataSource.getRepository("User");
    const u = await repo.findOneBy({ id: decoded.id });
    if (u && u.blocked) return res.status(403).json({ error: "blocked" });
    next();
  } catch {
    res.status(401).json({ error: "unauthorized" });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ error: "forbidden" });
  next();
}

module.exports = { requireAuth, requireAdmin };
