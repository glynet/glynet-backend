import express from "express";

import Comments from "./comments";
import Create from "./create";
import Delete from "./delete";
import Like from "./like";
import Likes from "./likes";

// /api/@me/comments/*
const comments = express.Router();

comments.get("/", Comments);
comments.get("/likes", Likes);
comments.post("/like", Like);
comments.put("/create", Create);
comments.delete("/delete", Delete);

export default comments;
