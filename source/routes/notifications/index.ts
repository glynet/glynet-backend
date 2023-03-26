import express from "express";

import Notifications from "./notifications";
import Subscribed from "./subscribed";
import UpdateUser from "./update_user";

// /api/@me/notifications/*
const notifications = express.Router();

notifications.get("/", Notifications);
notifications.get("/", Subscribed);
notifications.post("/", UpdateUser);

export default notifications;