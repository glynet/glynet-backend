import express from "express";

import Login from "./login";
import Register from "./register";
import ResetPassword from "./reset_password";
import FollowRequest from "./follow_request";
import FollowRequests from "./follow_requests";
import Blocks from "./blocks";

// /api/@me/client/*
const client = express.Router();

client.get("/blocks", Blocks);
client.get("/follow_requests", FollowRequests);

client.post("/login", Login);
client.post("/register", Register);
client.post("/reset_password", ResetPassword);
client.post("/update_follow_request", FollowRequest);

export default client;
