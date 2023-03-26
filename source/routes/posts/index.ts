import express, { Request } from "express";
import multer from "multer";

import Posts from "./posts";
import Likes from "./likes";
import Like from "./like";
import Delete from "./delete";
import Save from "./save";
import Create from "./create";
import Bookmarks from "./bookmarks";

import Loops from "./loops"

// /api/@me/posts/*
const posts = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 64000000,
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: any) => {
        cb(null, true);
    },
});

posts.get("/loops", Loops);

posts.get("/", Posts);
posts.get("/likes", Likes);

posts.post("/like", Like);
posts.post("/save", Save);
posts.post("/create", upload.array("file", 10), Create);

posts.delete("/bookmarks", Bookmarks);
posts.delete("/delete", Delete);

export default posts;
