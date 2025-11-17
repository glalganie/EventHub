const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Notification",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    type: { type: "enum", enum: ["registration", "event_update", "message"], default: "registration" },
    content: { type: "text" },
    read: { type: Boolean, default: false },
    createdAt: { type: "datetime", createDate: true },
  },
  relations: {
    user: { type: "many-to-one", target: "User", joinColumn: true },
    event: { type: "many-to-one", target: "Event", nullable: true, joinColumn: true },
  },
});
