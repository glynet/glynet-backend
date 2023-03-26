import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";
import getAvatar from "../../helpers/getAvatar";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const response: any[] = [];

    const follow_requests = await prisma.followings.findMany({
        where: {
            following_id: auth.id,
            accept: 0
        }
    });

    for (const request of follow_requests) {
        const user = await prisma.users.findFirst({
            where: {
                id: request.follower_id
            }
        });

        if (user) {
            response.push({
                user: {
                    id: user.snowflake,
                    name: user.name,
                    username: user.username,
                    avatar: await getAvatar(user),
                    flags: user.flags
                }
            });
        }
    }

    res.send({
        list: response
    });
}