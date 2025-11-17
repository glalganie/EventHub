const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Message",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    content: { type: "text" },
    createdAt: { type: "datetime", createDate: true },
  },
  relations: {
    event: { type: "many-to-one", target: "Event", joinColumn: true },
    user: { type: "many-to-one", target: "User", joinColumn: true },
  },
});
