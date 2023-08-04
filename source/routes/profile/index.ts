import express from "express";

import Profile from "./profile";
import Followings from "./followings";
import Followers from "./followers";
import Barrier from "./barrier";
import Follow from "./follow";


// /api/@me/profile/*
const profile = express.Router();


profile.get("/", Profile);
profile.get("/followings", Followings);
profile.get("/followers", Followers);
profile.post("/follow", Follow);
profile.post("/barrier/:type", Barrier);

export default profile;
