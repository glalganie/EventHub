const { Router } = require("express");
const { z } = require("zod");
const { AppDataSource } = require("../db/data-source");
const { requireAuth } = require("../middlewares/auth");

const router = Router();
const eventRepo = AppDataSource.getRepository("Event");
const userRepo = AppDataSource.getRepository("User");

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  category: z.string().min(2),
  city: z.string().min(2),
  imageUrl: z.string().url().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  startsAt: z.coerce.number(),
  endsAt: z.coerce.number().optional(),
  capacity: z.coerce.number().int().positive().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

const updateSchema = createSchema.partial();

router.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.toLowerCase() : undefined;
  const category = typeof req.query.category === "string" ? req.query.category.toLowerCase() : undefined;
  const city = typeof req.query.city === "string" ? req.query.city.toLowerCase() : undefined;
  const dateFrom = typeof req.query.dateFrom === "string" ? Number(req.query.dateFrom) : undefined;
  const dateTo = typeof req.query.dateTo === "string" ? Number(req.query.dateTo) : undefined;

  const qb = eventRepo.createQueryBuilder("event").where("event.status = :status", { status: "published" });
  if (q) qb.andWhere("(LOWER(event.title) LIKE :q OR LOWER(event.description) LIKE :q)", { q: `%${q}%` });
  if (category) qb.andWhere("LOWER(event.category) = :category", { category });
  if (city) qb.andWhere("LOWER(event.city) = :city", { city });
  if (dateFrom) qb.andWhere("event.startsAt >= :dateFrom", { dateFrom: new Date(dateFrom) });
  if (dateTo) qb.andWhere("event.startsAt <= :dateTo", { dateTo: new Date(dateTo) });

  const list = await qb.getMany();
  res.json(list);
});

router.get("/mine", requireAuth, async (req, res) => {
  console.log("events/mine for", req.user.id);
  const all = await eventRepo.find({ relations: { owner: true } });
  console.log("events/mine total", all.length);
  console.log("events/mine owners", all.map(e => e.owner && e.owner.id));
  const list = all.filter(e => e.owner && e.owner.id === req.user.id);
  console.log("events/mine matched", list.length);
  res.json(list);
});

router.get("/subscribed", requireAuth, async (req, res) => {
  const regRepo = AppDataSource.getRepository("Registration");
  const qb = regRepo.createQueryBuilder("reg").leftJoinAndSelect("reg.event", "event").leftJoin("reg.user", "user").where("user.id = :id", { id: req.user.id }).andWhere("reg.status = :status", { status: "active" });
  const regs = await qb.getMany();
  res.json(regs.map(r => r.event));
});

router.get("/:id", async (req, res) => {
  const found = await eventRepo.findOne({ where: { id: req.params.id } });
  if (!found) return res.status(404).json({ error: "not_found" });
  res.json(found);
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const data = parsed.data;
  const owner = await userRepo.findOneBy({ id: req.user.id });
  if (!owner) return res.status(401).json({ error: "unauthorized" });
  const event = eventRepo.create({
    owner,
    title: data.title,
    description: data.description,
    category: data.category,
    city: data.city,
    imageUrl: data.imageUrl ?? null,
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    startsAt: new Date(data.startsAt),
    endsAt: data.endsAt ? new Date(data.endsAt) : null,
    capacity: data.capacity ?? null,
    status: data.status || "published",
  });
  await eventRepo.save(event);
  res.status(201).json(event);
});

router.put("/:id", requireAuth, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
  const existing = await eventRepo.findOne({ where: { id: req.params.id }, relations: { owner: true } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  if (existing.owner.id !== req.user.id) return res.status(403).json({ error: "forbidden" });
  if (parsed.data.startsAt !== undefined) existing.startsAt = new Date(parsed.data.startsAt);
  if (parsed.data.endsAt !== undefined) existing.endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;
  if (parsed.data.lat !== undefined) existing.lat = parsed.data.lat ?? null;
  if (parsed.data.lng !== undefined) existing.lng = parsed.data.lng ?? null;
  if (parsed.data.capacity !== undefined) existing.capacity = parsed.data.capacity ?? null;
  if (parsed.data.title !== undefined) existing.title = parsed.data.title;
  if (parsed.data.description !== undefined) existing.description = parsed.data.description;
  if (parsed.data.category !== undefined) existing.category = parsed.data.category;
  if (parsed.data.city !== undefined) existing.city = parsed.data.city;
  if (parsed.data.status !== undefined) existing.status = parsed.data.status;
  if (parsed.data.imageUrl !== undefined) existing.imageUrl = parsed.data.imageUrl ?? null;
  await eventRepo.save(existing);
  res.json(existing);
});

// moved above to avoid ":id" catching "mine"/"subscribed"

router.delete("/:id", requireAuth, async (req, res) => {
  const existing = await eventRepo.findOne({ where: { id: req.params.id }, relations: { owner: true } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  if (existing.owner.id !== req.user.id) return res.status(403).json({ error: "forbidden" });
  await eventRepo.remove(existing);
  res.status(204).end();
});

module.exports = router;
