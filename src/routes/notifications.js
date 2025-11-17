const { Router } = require("express");
const { AppDataSource } = require("../db/data-source");
const { requireAuth } = require("../middlewares/auth");

const router = Router();
const notifRepo = AppDataSource.getRepository("Notification");

router.get("/", requireAuth, async (req, res) => {
  const qb = notifRepo.createQueryBuilder("n")
    .leftJoinAndSelect("n.event", "event")
    .leftJoinAndSelect("n.user", "user")
    .where("user.id = :id", { id: req.user.id })
    .orderBy("n.createdAt", "DESC");
  const list = await qb.getMany();
  res.json(list.map(n => ({ id: n.id, type: n.type, content: n.content, read: n.read, createdAt: n.createdAt, eventId: n.event ? n.event.id : null, userId: n.user ? n.user.id : null })));
});

router.put("/:id/read", requireAuth, async (req, res) => {
  const n = await notifRepo.findOne({ where: { id: req.params.id, user: { id: req.user.id } } });
  if (!n) return res.status(404).json({ error: "not_found" });
  n.read = true;
  await notifRepo.save(n);
  res.json({ ok: true });
});

router.put("/read-all", requireAuth, async (req, res) => {
  const userId = req.user.id;
  await notifRepo.createQueryBuilder().update("Notification").set({ read: true }).where("userId = :userId", { userId }).execute();
  res.json({ ok: true });
});

module.exports = router;
