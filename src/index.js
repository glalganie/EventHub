require("reflect-metadata");
const app = require("./app");
const { AppDataSource } = require("./db/data-source");
const bcrypt = require("bcryptjs");

const port = Number(process.env.PORT || 3001);

AppDataSource.initialize()
  .then(() => {
    const repo = AppDataSource.getRepository("User");
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || "Admin";
    (async () => {
      if (adminEmail) {
        const existing = await repo.findOne({ where: { email: adminEmail.toLowerCase() } });
        if (!existing && adminPassword) {
          const hash = await bcrypt.hash(adminPassword, 10);
          const user = repo.create({ email: adminEmail.toLowerCase(), name: adminName, passwordHash: hash, role: "admin" });
          await repo.save(user);
          console.log(`seeded admin ${adminEmail}`);
        } else if (existing && existing.role !== "admin") {
          existing.role = "admin";
          await repo.save(existing);
          console.log(`promoted admin ${adminEmail}`);
        }
      }
    })().catch(err => console.error("admin seed error", err));
    app.listen(port, () => {
      console.log(`server listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("db init error", err);
    process.exit(1);
  });
