const { EntitySchema } = require("typeorm");

module.exports = new EntitySchema({
  name: "Event",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    title: { type: String },
    description: { type: "text" },
    category: { type: String },
    city: { type: String },
    imageUrl: { type: String, nullable: true },
    lat: { type: "double", nullable: true },
    lng: { type: "double", nullable: true },
    startsAt: { type: "datetime" },
    endsAt: { type: "datetime", nullable: true },
    capacity: { type: "int", nullable: true },
    status: { type: "enum", enum: ["draft", "published", "archived"], default: "published" },
    createdAt: { type: "datetime", createDate: true },
  },
  relations: {
    owner: { type: "many-to-one", target: "User", eager: true, joinColumn: true },
    registrations: { type: "one-to-many", target: "Registration", inverseSide: "event" },
  },
});
