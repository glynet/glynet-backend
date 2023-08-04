import express, { Express, NextFunction, Request, Response } from "express";
import useragent from "express-useragent";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import bodyParser from "body-parser";
import helmet from "helmet";
import { log } from "./services/utils";
import delay from "express-delay";

import comments from "./routes/comments/";
import profile from "./routes/profile";
import notifications from "./routes/notifications/";
import client from "./routes/client/";
import posts from "./routes/posts/";

import settings from "./routes/settings/settings";
import search from "./routes/search/search";
import fs from "fs";
dotenv.config();

const app: Express = express();
const port: number = parseInt(process.env.PORT as string) || 3400;

app.disable("etag");
app.disable("x-powered-by");
/*
app.use(helmet({
    hidePoweredBy: true,
    frameguard: {
        action: "sameorigin"
    }
}));
*/
// BUNU KONTROL ETMEYİ UNUTMA
app.use((req: any, res: any, next: any) => {
    if (port !== 80 || !process.env.CSP_DISABLE) {
        res.set({
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
            "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
            "Content-Security-Policy": "default-src * 'self' 'unsafe-inline' 'unsafe-eval'; script-src * 'self' 'unsafe-inline' 'unsafe-eval' localhost:*/*",
            "X-Content-Security-Policy": "default-src * 'self' 'unsafe-inline' 'unsafe-eval'; script-src * 'self' 'unsafe-inline' 'unsafe-eval' localhost:*/*",
            "X-WebKit-CSP": "default-src * 'self' 'unsafe-inline' 'unsafe-eval'; script-src * 'self' 'unsafe-inline' 'unsafe-eval' localhost:*/*"
        });
    }

    next();
});

app.use("/cdn", express.static(path.join(__dirname, "../", "attachments")));
app.use("/attachments", express.static(path.join(__dirname, "../", "attachments")));
app.use("/static", express.static(path.join(__dirname, "../", "static")));

// app.use(delay(300));
app.use(cors());
//app.use(useragent.express());
/*
app.use(rateLimit({
    windowMs: 16000,
    max: 32,
    message: {
        status: false,
        code: 0,
        message: "Biraz sakin ol",
        list: []
    }
}));
*/
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());




app.use("/api/@me/v1/", (req: Request, res: Response, next: NextFunction) => {
    console.log("");
    log('\x1b[43m', `\x1b[37m ${req.method} \x1b[0m\x1b[33m ${req.originalUrl} (${res.statusCode})`);

    if (!req.headers.authorization) {
        return res.status(403).json({
            error: "No credentials sent!"
        });
    } else {
        log('\x1b[33m', `Token => \x1b[37m${req.headers.authorization}`);
    }

    next();
});

app.use("/api/@me/v1/posts", posts);
app.use("/api/@me/v1/search", search);
app.use("/api/@me/v1/profile", profile);
app.use("/api/@me/v1/comments", comments);
app.use("/api/@me/v1/client", client);
app.use("/api/@me/v1/notifications", notifications);
app.use("/api/@me/v1/settings", settings);

app.set("view engine", "pug");

app.get("/", (req: Request, res: Response) => {
    res.render("index", {
        meta: {
            title: "Looplens",
            description: "Looplens'teki yeni haberlerden ve gelişmelerden haberdar olun.",
            url: "https://glynet.com",
            image: "https://res.cloudinary.com/dsr7kja6p/image/upload/v1666044163/BlogBanner_od3mxo.png",
            twitter: "@looplens",
            twitter_card: "summary_large_image",
            color: "#2aa0ad",
        },
        message: "Burasi bir harika!"
    });
});

app.use((req: Request, res: Response, next: NextFunction) => {
    log('\x1b[31m', `Someone is trying to access a non-existent page. => ${req.url}`);
    res.status(404).send("01000010 01100101 01101110 01101001 00100000 01101101 01100001 01111010 01110101 01110010 00100000 01100111 01101111 01110010 01110101 01101110 00101100 00100000 01100010 01110101 00100000 01101110 01100101 00100000 01110011 00100001 00100001 00110001 00100001 00111111")
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack)
    res.status(500).send("Bir şeyler kırıldı... (Kalbim değil)")
});

app.listen(port, () => {
    console.log("");
    log('\x1b[32m', `Brain woke up from sleep, browsing the network at \x1b[4mhttp://localhost:${port}`);

});

process.on("uncaughtException", (err) => {
    console.log("\n\n\n");
    log("\x1b[41m", "\x1b[37m ERROR \x1b[0m\x1b[31m Something went wrong...");
    console.error(err);
    console.log("\n\n\n");
});
