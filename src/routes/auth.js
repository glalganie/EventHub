const { Router } = require("express");
const { z } = require("zod");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { AppDataSource } = require("../db/data-source");
const nodemailer = require("nodemailer");
const https = require("https");
const querystring = require("querystring");

const router = Router();
const signupSchema = z.object({ email: z.string().email(), name: z.string().min(2), password: z.string().min(8) });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });

const userRepo = AppDataSource.getRepository("User");
const resetRepo = AppDataSource.getRepository("PasswordReset");
const crypto = require("crypto");

router.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const { email, name, password } = parsed.data;
  const existing = await userRepo.findOne({ where: { email: email.toLowerCase() } });
  if (existing) return res.status(409).json({ error: "email_exists" });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = userRepo.create({ email: email.toLowerCase(), name, passwordHash, role: "user", emailVerified: false });
  await userRepo.save(user);
  try {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const pr = resetRepo.create({ email: user.email, token, expiresAt });
    await resetRepo.save(pr);
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 0);
    const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
    const userSmtp = process.env.SMTP_USER;
    const passSmtp = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM || "no-reply@eventhub.local";
    if (host && port && userSmtp && passSmtp) {
      const transporter = nodemailer.createTransport({ host, port, secure, auth: { user: userSmtp, pass: passSmtp } });
      const verifyUrl = (process.env.PUBLIC_BASE_URL || "http://localhost:" + (process.env.PORT || 3001)) + "/verify?email=" + encodeURIComponent(user.email) + "&token=" + encodeURIComponent(token);
      await transporter.sendMail({ from, to: user.email, subject: "Verifica email EventHub", text: "Verifica la tua email con il token: " + token + "\nOppure apri: " + verifyUrl });
    }
  } catch {}
  res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const { email, password } = parsed.data;
  const user = await userRepo.findOne({ where: { email: email.toLowerCase() } });
  if (!user) return res.status(401).json({ error: "invalid_credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "invalid_credentials" });
  const payload = { id: user.id, role: user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET || "change_me", { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: !!user.emailVerified } });
});

router.post("/logout", async (_req, res) => {
  res.json({ ok: true });
});

router.post("/password-reset/request", async (req, res) => {
  const email = String(req.body?.email || "").toLowerCase();
  const user = await userRepo.findOne({ where: { email } });
  if (!user) return res.status(200).json({ ok: true });
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const pr = resetRepo.create({ email, token, expiresAt });
  await resetRepo.save(pr);
  try {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 0);
    const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
    const userSmtp = process.env.SMTP_USER;
    const passSmtp = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM || "no-reply@eventhub.local";
    if (host && port && userSmtp && passSmtp) {
      const transporter = nodemailer.createTransport({ host, port, secure, auth: { user: userSmtp, pass: passSmtp } });
      const resetUrl = (process.env.PUBLIC_BASE_URL || "http://localhost:" + (process.env.PORT || 3001)) + "/reset?email=" + encodeURIComponent(email) + "&token=" + encodeURIComponent(token);
      await transporter.sendMail({ from, to: email, subject: "EventHub Password Reset", text: "Per reimpostare la password usa il token: " + token + "\nOppure apri: " + resetUrl });
    }
  } catch {}
  res.json({ ok: true, token });
});

router.post("/password-reset/confirm", async (req, res) => {
  const email = String(req.body?.email || "").toLowerCase();
  const token = String(req.body?.token || "");
  const newPassword = String(req.body?.password || "");
  if (newPassword.length < 8) return res.status(400).json({ error: "weak_password" });
  const record = await resetRepo.findOne({ where: { email, token } });
  if (!record) return res.status(400).json({ error: "invalid_token" });
  if (record.used) return res.status(400).json({ error: "token_used" });
  if (record.expiresAt.getTime() < Date.now()) return res.status(400).json({ error: "token_expired" });
  const user = await userRepo.findOne({ where: { email } });
  if (!user) return res.status(404).json({ error: "not_found" });
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  record.used = true;
  await userRepo.save(user);
  await resetRepo.save(record);
  res.json({ ok: true });
});

router.post("/verify/request", async (req, res) => {
  const email = String(req.body?.email || "").toLowerCase();
  const user = await userRepo.findOne({ where: { email } });
  if (!user) return res.status(200).json({ ok: true });
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pr = resetRepo.create({ email, token, expiresAt });
  await resetRepo.save(pr);
  try {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 0);
    const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
    const userSmtp = process.env.SMTP_USER;
    const passSmtp = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM || "no-reply@eventhub.local";
    if (host && port && userSmtp && passSmtp) {
      const transporter = nodemailer.createTransport({ host, port, secure, auth: { user: userSmtp, pass: passSmtp } });
      const verifyUrl = (process.env.PUBLIC_BASE_URL || "http://localhost:" + (process.env.PORT || 3001)) + "/verify?email=" + encodeURIComponent(email) + "&token=" + encodeURIComponent(token);
      await transporter.sendMail({ from, to: email, subject: "Verifica email EventHub", text: "Verifica la tua email con il token: " + token + "\nOppure apri: " + verifyUrl });
    }
  } catch {}
  res.json({ ok: true, token });
});

router.post("/verify/confirm", async (req, res) => {
  const email = String(req.body?.email || "").toLowerCase();
  const token = String(req.body?.token || "");
  const record = await resetRepo.findOne({ where: { email, token } });
  if (!record) return res.status(400).json({ error: "invalid_token" });
  if (record.used) return res.status(400).json({ error: "token_used" });
  if (record.expiresAt.getTime() < Date.now()) return res.status(400).json({ error: "token_expired" });
  const user = await userRepo.findOne({ where: { email } });
  if (!user) return res.status(404).json({ error: "not_found" });
  user.emailVerified = true;
  record.used = true;
  await userRepo.save(user);
  await resetRepo.save(record);
  res.json({ ok: true });
});

function getJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "GET", headers }, (r) => {
      let data = "";
      r.on("data", (c) => (data += c));
      r.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function postForm(url, form, headers = {}) {
  const body = querystring.stringify(form);
  const merged = { "Content-Type": "application/x-www-form-urlencoded", ...headers };
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "POST", headers: merged }, (r) => {
      let data = "";
      r.on("data", (c) => (data += c));
      r.on("end", () => {
        try {
          const ct = String(r.headers["content-type"] || "");
          if (ct.includes("application/json")) resolve(JSON.parse(data));
          else resolve(querystring.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

router.post("/oauth/google", async (req, res) => {
  try {
    const idToken = String(req.body?.idToken || "");
    if (!idToken) return res.status(400).json({ error: "missing_token" });
    const info = await getJson("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken));
    const audOk = !process.env.GOOGLE_CLIENT_ID || info.aud === process.env.GOOGLE_CLIENT_ID;
    if (!audOk) return res.status(401).json({ error: "invalid_client_id" });
    const email = String(info.email || "").toLowerCase();
    if (!email) return res.status(400).json({ error: "email_missing" });
    const name = String(info.name || info.email || "Google User");
    let user = await userRepo.findOne({ where: { email } });
    if (!user) {
      const rnd = require("crypto").randomBytes(16).toString("hex");
      const passwordHash = await bcrypt.hash(rnd, 10);
      user = userRepo.create({ email, name, passwordHash, role: "user", emailVerified: true, provider: "google", providerId: String(info.sub || "") });
    } else {
      user.provider = "google";
      user.providerId = String(info.sub || user.providerId || "");
      user.emailVerified = true;
    }
    await userRepo.save(user);
    const payload = { id: user.id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET || "change_me", { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: !!user.emailVerified } });
  } catch (err) {
    res.status(401).json({ error: "oauth_failed" });
  }
});

router.post("/oauth/github", async (req, res) => {
  try {
    const code = String(req.body?.code || "");
    const accessToken = String(req.body?.accessToken || "");
    let token = accessToken;
    if (!token) {
      if (!code) return res.status(400).json({ error: "missing_code" });
      if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) return res.status(500).json({ error: "missing_client" });
      const form = { client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code };
      const resTok = await postForm("https://github.com/login/oauth/access_token", form, { Accept: "application/json" });
      token = String(resTok.access_token || "");
      if (!token) return res.status(401).json({ error: "code_exchange_failed" });
    }
    const userInfo = await getJson("https://api.github.com/user", { Authorization: "Bearer " + token, "User-Agent": "EventHub" });
    let email = "";
    try {
      const emails = await getJson("https://api.github.com/user/emails", { Authorization: "Bearer " + token, "User-Agent": "EventHub" });
      const primary = Array.isArray(emails) ? emails.find(e => e.primary && e.verified) : null;
      email = String(primary?.email || "");
    } catch {}
    if (!email) email = String(userInfo.login || userInfo.id) + "@users.noreply.github.com";
    email = email.toLowerCase();
    const name = String(userInfo.name || userInfo.login || email);
    let user = await userRepo.findOne({ where: { email } });
    if (!user) {
      const rnd = require("crypto").randomBytes(16).toString("hex");
      const passwordHash = await bcrypt.hash(rnd, 10);
      user = userRepo.create({ email, name, passwordHash, role: "user", emailVerified: true, provider: "github", providerId: String(userInfo.id || "") });
    } else {
      user.provider = "github";
      user.providerId = String(userInfo.id || user.providerId || "");
      user.emailVerified = true;
    }
    await userRepo.save(user);
    const payload = { id: user.id, role: user.role };
    const tokenJwt = jwt.sign(payload, process.env.JWT_SECRET || "change_me", { expiresIn: "7d" });
    res.json({ token: tokenJwt, user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: !!user.emailVerified } });
  } catch (err) {
    res.status(401).json({ error: "oauth_failed" });
  }
});

module.exports = router;
