require("reflect-metadata");
const { DataSource } = require("typeorm");
const User = require("../entities/User");
const Event = require("../entities/Event");
const Registration = require("../entities/Registration");
const Notification = require("../entities/Notification");
const Report = require("../entities/Report");
const Message = require("../entities/Message");
const PasswordReset = require("../entities/PasswordReset");

const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT || 3306),
  username: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "tchissambou",
  database: process.env.MYSQL_DATABASE || "eventhub",
  entities: [User, Event, Registration, Notification, Report, Message, PasswordReset],
  synchronize: true,
  logging: false,
});

module.exports = { AppDataSource };
