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

import client from "./routes/client/client";
import posts from "./routes/posts/posts";
import comments from "./routes/posts/comments";
import search from "./routes/search/search";
import profile from "./routes/profile/profile";
import notifications from "./routes/client/notifications";
import settings from "./routes/client/settings";

dotenv.config();

const app: Express = express();
const port: number = parseInt(process.env.PORT as string) || 3400;

app.disable("etag");
app.disable("x-powered-by");
app.use(helmet({
    hidePoweredBy: true,
    frameguard: {
        action: "sameorigin"
    }
}));

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

app.use(delay(600));
app.use(cors());
app.use(useragent.express());
app.use(rateLimit({
    windowMs: 16000,
    max: 24,
    message: {
        message: "Biraz sakin ol",
    }
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use("/api/@me/", (req: Request, res: Response, next: NextFunction) => {
    console.log("");
    log('\x1b[35m', `${req.method} ${req.originalUrl} (${res.statusCode})`);

    if (!req.headers.authorization) {
        return res.status(403).json({
            error: "No credentials sent!"
        });
    } else {
        log('\x1b[35m', `Token: ${req.headers.authorization}`);
    }

    next();
});

app.use("/api/@me/posts", posts);
app.use("/api/@me/search", search);
app.use("/api/@me/profile", profile);
app.use("/api/@me/comments", comments);
app.use("/api/@me/client", client);
app.use("/api/@me/notifications", notifications);
app.use("/api/@me/settings", settings);

app.set("view engine", "pug");

app.get("/", (req: Request, res: Response) => {
    res.render("index", {
        meta: {
            title: "Glynet",
            description: "Glynet'teki yeni haberlerden ve gelişmelerden haberdar olun.",
            url: "https://glynet.com",
            image: "https://res.cloudinary.com/dsr7kja6p/image/upload/v1666044163/BlogBanner_od3mxo.png",
            twitter: "@glynet",
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
    log('\x1b[36m', `Server is running at http://localhost:${port}`);
});

process.on("uncaughtException", (err) => {
    console.log("🚀 ~ file: index.ts:118 ~ process.on ~ err:", err); 
});
