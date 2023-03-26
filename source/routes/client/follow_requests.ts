import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";
import getAvatar from "../../helpers/getAvatar";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const response: any[] = [];

    const blocks = await prisma.blocks.findMany({
        where: {
            client_id: auth.id.toString()
        }
    });

    for (const block of blocks) {
        const user = await prisma.users.findFirst({
            where: { id: Number(block.user_id) }
        });

        if (user) {
            response.push({
                user: {
                    id: user.snowflake,
                    name: user.name,
                    username: user.username,
                    avatar: await getAvatar(user),
                    flags: user.flags
                },
                type: block.type,
                timestamp: block.timestamp
            });
        }
    }

    return res.send({
        list: response
    });
}