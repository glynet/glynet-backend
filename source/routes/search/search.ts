import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { SearchItem } from "../../models/search.model";
import moment from "moment";
import { calculateUserFlags } from "../../services/flags";

const prisma = new PrismaClient();
const search = express.Router();

search.get("/", async function (req: Request, res: Response) {
    const { value } = req.query;
    const response: SearchItem[] = [];

    if (value) {
        const users = await prisma.users.findMany({
            take: 4,
            where: {
                OR: [
                    { name: { contains: value.toString() } },
                    { username: { contains: value.toString() } }
                ]
            }
        });

        const locations = await prisma.posts.findMany({
            take: 4,
            where: {
                OR: [
                    { location: { contains: value.toString() } },
                ]
            }
        });

        for (const user of users) {
            const flags = calculateUserFlags(user.flags);

            if (!(flags.includes("DELETED") || flags.includes("SELF_DELETED"))) {
                response.push({
                    type: "profile",
                    title: user.name,
                    subtitle: user.username,
                    image: user.avatar
                });
            }
        }

        for (const location of locations) {
            response.push({
                type: "location",
                title: location.location,
            });
        }
    }

    res.send(response);
});

export default search;
