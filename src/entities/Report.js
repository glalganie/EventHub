const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Report",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    targetType: { type: "enum", enum: ["event", "message", "user"] },
    targetId: { type: String },
    reason: { type: "text" },
    status: { type: "enum", enum: ["open", "reviewed", "closed"], default: "open" },
    createdAt: { type: "datetime", createDate: true },
  },
  relations: {
    reporter: { type: "many-to-one", target: "User", joinColumn: true },
    event: { type: "many-to-one", target: "Event", nullable: true, joinColumn: true },
  },
});
