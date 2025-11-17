const { Router } = require("express");
const { AppDataSource } = require("../db/data-source");
const nodemailer = require("nodemailer");
const { requireAuth } = require("../middlewares/auth");
const { emitEvent, emitUser } = require("../realtime/sse");

const router = Router({ mergeParams: true });
const eventRepo = AppDataSource.getRepository("Event");
const regRepo = AppDataSource.getRepository("Registration");
const userRepo = AppDataSource.getRepository("User");
const notifRepo = AppDataSource.getRepository("Notification");

router.post("/", requireAuth, async (req, res) => {
  const event = await eventRepo.findOne({ where: { id: req.params.id }, relations: { owner: true } });
  if (!event) return res.status(404).json({ error: "event_not_found" });
  const user = await userRepo.findOneBy({ id: req.user.id });
  if (!user) return res.status(401).json({ error: "unauthorized" });
  

  if (event.capacity) {
    const count = await regRepo.count({ where: { event: { id: event.id }, status: "active" } });
    if (count >= event.capacity) return res.status(409).json({ error: "event_full" });
  }

  const existing = await regRepo.findOne({ where: { event: { id: event.id }, user: { id: user.id }, status: "active" } });
  if (existing) return res.status(409).json({ error: "already_registered" });

  const registration = regRepo.create({ event, user, status: "active" });
  await regRepo.save(registration);

  const notif = notifRepo.create({ user: event.owner, event, type: "registration", content: `${user.name} si è iscritto a ${event.title}` });
  await notifRepo.save(notif);

  emitEvent(event.id, { type: "registration", eventId: event.id, userId: user.id, userName: user.name });
  emitUser(event.owner.id, { type: "notification", notificationId: notif.id, content: notif.content });

  try {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 0);
    const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
    const userSmtp = process.env.SMTP_USER;
    const passSmtp = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM || "no-reply@eventhub.local";
    if (host && port && userSmtp && passSmtp) {
      const transporter = nodemailer.createTransport({ host, port, secure, auth: { user: userSmtp, pass: passSmtp } });
      const text = `Iscrizione confermata all'evento: ${event.title}\nCittà: ${event.city}\nData: ${new Date(event.startsAt).toLocaleString()}`;
      await transporter.sendMail({ from, to: user.email, subject: "Conferma iscrizione EventHub", text });
    }
  } catch {}

  res.status(201).json({ id: registration.id });
});

router.get("/", requireAuth, async (req, res) => {
  const event = await eventRepo.findOne({ where: { id: req.params.id }, relations: { owner: true } });
  if (!event) return res.status(404).json({ error: "event_not_found" });
  if (event.owner.id !== req.user.id) return res.status(403).json({ error: "forbidden" });
  const list = await regRepo.find({ where: { event: { id: event.id } }, relations: { user: true } });
  res.json(list.map(r => ({ id: r.id, user: { id: r.user.id, name: r.user.name, email: r.user.email }, status: r.status, createdAt: r.createdAt })));
});

router.delete("/me", requireAuth, async (req, res) => {
  console.log("registrations delete/me", req.user && req.user.id, req.params && req.params.id);
  const event = await eventRepo.findOne({ where: { id: req.params.id }, relations: { owner: true } });
  if (!event) return res.status(404).json({ error: "event_not_found" });
  const reg = await regRepo.findOne({ where: { event: { id: event.id }, user: { id: req.user.id }, status: "active" }, relations: { event: true, user: true } });
  if (!reg) { console.log("registrations not_registered", req.user && req.user.id, event.id); return res.status(404).json({ error: "not_registered" }); }
  reg.status = "canceled";
  await regRepo.save(reg);
  console.log("registrations canceled", req.user && req.user.id, event.id, reg.id);
  emitEvent(event.id, { type: "registration_canceled", eventId: event.id, userId: req.user.id });
  const notif = notifRepo.create({ user: event.owner, event, type: "registration", content: `${reg.user.name} ha annullato l'iscrizione` });
  await notifRepo.save(notif);
  emitUser(event.owner.id, { type: "notification", notificationId: notif.id, content: notif.content });
  res.status(204).end();
});

router.delete("/:regId", requireAuth, async (req, res) => {
  console.log("registrations delete/:regId", req.user && req.user.id, req.params && req.params.regId);
  const reg = await regRepo.findOne({ where: { id: req.params.regId }, relations: { user: true, event: true } });
  if (!reg) { console.log("registrations not_found", req.params && req.params.regId); return res.status(404).json({ error: "not_found" }); }
  if (reg.user.id !== req.user.id) { console.log("registrations forbidden", req.user && req.user.id, reg.user && reg.user.id); return res.status(403).json({ error: "forbidden" }); }
  reg.status = "canceled";
  await regRepo.save(reg);
  console.log("registrations canceled by regId", req.user && req.user.id, reg.event && reg.event.id, reg.id);
  emitEvent(reg.event.id, { type: "registration_canceled", eventId: reg.event.id, userId: reg.user.id });
  const notif = notifRepo.create({ user: reg.event.owner, event: reg.event, type: "registration", content: `${reg.user.name} ha annullato l'iscrizione` });
  await notifRepo.save(notif);
  emitUser(reg.event.owner.id, { type: "notification", notificationId: notif.id, content: notif.content });
  res.status(204).end();
});

module.exports = router;
