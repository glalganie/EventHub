const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "User",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    email: { type: String, unique: true },
    name: { type: String },
    passwordHash: { type: String },
    role: { type: "enum", enum: ["user", "admin"], default: "user" },
    emailVerified: { type: Boolean, default: false },
    provider: { type: "enum", enum: ["local", "google", "github"], default: "local" },
    providerId: { type: String, nullable: true },
    blocked: { type: Boolean, default: false },
    createdAt: { type: "datetime", createDate: true },
  },
  relations: {
    events: { type: "one-to-many", target: "Event", inverseSide: "owner" },
    registrations: { type: "one-to-many", target: "Registration", inverseSide: "user" },
  },
});
