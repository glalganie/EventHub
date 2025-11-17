const { AppDataSource } = require("../src/db/data-source");
const app = require("../src/app");

let initialized = false;
async function ensureDb() {
  if (!initialized) {
    try {
      await AppDataSource.initialize();
      initialized = true;
    } catch (err) {
      console.error("db init error", err);
    }
  }
}

module.exports = async (req, res) => {
  await ensureDb();
  return app(req, res);
};

