const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Registration",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    status: { type: "enum", enum: ["active", "canceled"], default: "active" },
    createdAt: { type: "datetime", createDate: true },
  },
  relations: {
    event: { type: "many-to-one", target: "Event", joinColumn: true },
    user: { type: "many-to-one", target: "User", joinColumn: true },
  },
});
