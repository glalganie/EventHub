const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "PasswordReset",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    email: { type: String },
    token: { type: String },
    expiresAt: { type: "datetime" },
    used: { type: Boolean, default: false },
    createdAt: { type: "datetime", createDate: true },
  },
});
