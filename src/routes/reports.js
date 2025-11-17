const { Router } = require("express");
const { z } = require("zod");
const { AppDataSource } = require("../db/data-source");
const { emitUser } = require("../realtime/sse");
const { requireAuth } = require("../middlewares/auth");

const router = Router();
const reportRepo = AppDataSource.getRepository("Report");
const userRepo = AppDataSource.getRepository("User");
const notifRepo = AppDataSource.getRepository("Notification");

const createSchema = z.object({
  targetType: z.enum(["event", "message", "user"]),
  targetId: z.string().min(1),
  reason: z.string().min(5),
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const reporter = await userRepo.findOneBy({ id: req.user.id });
  if (!reporter) return res.status(401).json({ error: "unauthorized" });
  const r = reportRepo.create({ ...parsed.data, reporter });
  await reportRepo.save(r);
  const admins = await userRepo.find({ where: { role: "admin" } });
  for (const admin of admins) {
    const notif = notifRepo.create({ user: admin, event: null, type: "event_update", content: `Segnalazione: ${parsed.data.targetType} ${parsed.data.targetId} - ${parsed.data.reason}` });
    await notifRepo.save(notif);
    emitUser(admin.id, { type: "notification", notificationId: notif.id, content: notif.content });
  }
  res.status(201).json({ id: r.id });
});

module.exports = router;
