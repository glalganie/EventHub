const eventSubscribers = new Map();
const userSubscribers = new Map();
const { AppDataSource } = require("../db/data-source");

function setupSSE(res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.write(":ok\n\n");
}

async function subscribeEvent(req, res) {
  const id = req.params.id;
  const token = req.query.token;
  if (!token) { res.statusCode = 401; return res.end(); }
  let userId = null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "change_me");
    userId = decoded?.id;
  } catch {
    res.statusCode = 401; return res.end();
  }
  try {
    const eventRepo = AppDataSource.getRepository("Event");
    const regRepo = AppDataSource.getRepository("Registration");
    const ev = await eventRepo.findOne({ where: { id }, relations: { owner: true } });
    if (!ev) { res.statusCode = 404; return res.end(); }
    const isOwner = ev.owner && String(ev.owner.id) === String(userId);
    let allowed = isOwner;
    if (!allowed) {
      const reg = await regRepo.findOne({ where: { event: { id }, user: { id: userId }, status: "active" } });
      allowed = !!reg;
    }
    if (!allowed) { res.statusCode = 403; return res.end(); }
  } catch {
    res.statusCode = 500; return res.end();
  }
  setupSSE(res);
  const set = eventSubscribers.get(id) || new Set();
  set.add(res);
  eventSubscribers.set(id, set);
  req.on("close", () => {
    set.delete(res);
  });
}

async function subscribeUser(req, res) {
  const id = req.params.id;
  const token = req.query.token;
  if (!token) { res.statusCode = 401; return res.end(); }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "change_me");
    const isAdmin = decoded && decoded.role === "admin";
    const isSelf = decoded && String(decoded.id) === String(id);
    try {
      const userRepo = AppDataSource.getRepository("User");
      const u = await userRepo.findOneBy({ id });
      if (!u || u.blocked) { res.statusCode = 403; return res.end(); }
    } catch { res.statusCode = 500; return res.end(); }
    if (!isAdmin && !isSelf) { res.statusCode = 403; return res.end(); }
  } catch {
    res.statusCode = 401; return res.end();
  }
  setupSSE(res);
  const set = userSubscribers.get(id) || new Set();
  set.add(res);
  userSubscribers.set(id, set);
  req.on("close", () => {
    set.delete(res);
  });
}

function send(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function emitEvent(eventId, data) {
  const set = eventSubscribers.get(eventId);
  if (!set) return;
  for (const res of set) send(res, data);
}

function emitUser(userId, data) {
  const set = userSubscribers.get(userId);
  if (!set) return;
  for (const res of set) send(res, data);
}

module.exports = { subscribeEvent, subscribeUser, emitEvent, emitUser };
const jwt = require("jsonwebtoken");
