const { Router } = require("express");
const { AppDataSource } = require("../db/data-source");
const { requireAuth, requireAdmin } = require("../middlewares/auth");

const router = Router();
const userRepo = AppDataSource.getRepository("User");
const eventRepo = AppDataSource.getRepository("Event");
const reportRepo = AppDataSource.getRepository("Report");

router.use(requireAuth, requireAdmin);

router.get("/users", async (_req, res) => {
  const list = await userRepo.find();
  res.json(list.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt })));
});

router.get("/events", async (_req, res) => {
  const list = await eventRepo.find();
  res.json(list);
});

router.get("/reports", async (_req, res) => {
  const list = await reportRepo.find();
  res.json(list);
});

router.put("/users/:id/role", async (req, res) => {
  const role = req.body?.role;
  if (role !== "user" && role !== "admin") return res.status(400).json({ error: "invalid_role" });
  const u = await userRepo.findOneBy({ id: req.params.id });
  if (!u) return res.status(404).json({ error: "not_found" });
  u.role = role;
  await userRepo.save(u);
  res.json({ ok: true });
});

router.put("/users/:id/block", async (req, res) => {
  const blocked = !!req.body?.blocked;
  const u = await userRepo.findOneBy({ id: req.params.id });
  if (!u) return res.status(404).json({ error: "not_found" });
  u.blocked = blocked;
  await userRepo.save(u);
  res.json({ ok: true });
});

router.put("/events/:id/moderate", async (req, res) => {
  const status = req.body?.status;
  if (!["draft", "published", "archived"].includes(status)) return res.status(400).json({ error: "invalid_status" });
  const e = await eventRepo.findOneBy({ id: req.params.id });
  if (!e) return res.status(404).json({ error: "not_found" });
  e.status = status;
  await eventRepo.save(e);
  res.json({ ok: true });
});

router.put("/reports/:id/status", async (req, res) => {
  const status = req.body?.status;
  if (!["open", "reviewed", "closed"].includes(status)) return res.status(400).json({ error: "invalid_status" });
  const r = await reportRepo.findOneBy({ id: req.params.id });
  if (!r) return res.status(404).json({ error: "not_found" });
  r.status = status;
  await reportRepo.save(r);
  res.json({ ok: true });
});

module.exports = router;
