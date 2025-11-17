const { Router } = require("express");
const { z } = require("zod");
const { AppDataSource } = require("../db/data-source");
const { requireAuth } = require("../middlewares/auth");
const { emitEvent, emitUser } = require("../realtime/sse");

const router = Router({ mergeParams: true });
const eventRepo = AppDataSource.getRepository("Event");
const userRepo = AppDataSource.getRepository("User");
const msgRepo = AppDataSource.getRepository("Message");
const regRepo = AppDataSource.getRepository("Registration");
const notifRepo = AppDataSource.getRepository("Notification");

const postSchema = z.object({ content: z.string().min(1).max(1000) });

function sanitizeText(s) {
  const t = String(s).slice(0, 1000);
  return t.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}

router.get("/", requireAuth, async (req, res) => {
  const event = await eventRepo.findOne({ where: { id: req.params.id }, relations: { owner: true } });
  if (!event) return res.status(404).json({ error: "event_not_found" });
  const isOwner = event.owner && event.owner.id === req.user.id;
  let canView = isOwner;
  if (!canView) {
    const regRepo = AppDataSource.getRepository("Registration");
    const reg = await regRepo.findOne({ where: { event: { id: event.id }, user: { id: req.user.id }, status: "active" } });
    canView = !!reg;
  }
  if (!canView) return res.status(403).json({ error: "forbidden" });
  const list = await msgRepo.find({ where: { event: { id: event.id } }, relations: { user: true }, order: { createdAt: "ASC" } });
  res.json(list.map(m => ({ id: m.id, content: m.content, user: { id: m.user.id, name: m.user.name }, createdAt: m.createdAt })));
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const event = await eventRepo.findOne({ where: { id: req.params.id }, relations: { owner: true } });
  if (!event) return res.status(404).json({ error: "event_not_found" });
  const user = await userRepo.findOneBy({ id: req.user.id });
  if (!user) return res.status(401).json({ error: "unauthorized" });
  if (event.owner.id !== user.id) {
    const activeReg = await regRepo.findOne({ where: { event: { id: event.id }, user: { id: user.id }, status: "active" } });
    if (!activeReg) return res.status(403).json({ error: "forbidden" });
  }
  const safeContent = sanitizeText(parsed.data.content);
  const safeUserName = sanitizeText(user.name || "");
  const msg = msgRepo.create({ event, user, content: safeContent });
  await msgRepo.save(msg);
  emitEvent(event.id, { type: "message", id: msg.id, content: msg.content, user: { id: user.id, name: safeUserName }, createdAt: msg.createdAt });
  const notif = notifRepo.create({ user: event.owner, event, type: "message", content: `${safeUserName}: ${msg.content}` });
  await notifRepo.save(notif);
  emitUser(event.owner.id, { type: "notification", notificationId: notif.id, content: notif.content });
  res.status(201).json({ id: msg.id });
});

module.exports = router;
