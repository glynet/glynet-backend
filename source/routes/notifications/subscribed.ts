import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";
import moment from "moment";
import getAvatar from "../../helpers/getAvatar";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const response: any[] = [];

    const subscribed_users = await prisma.user_notifications.findMany({
        where: {
            author_id: auth.id,
            type: "all_notifications"
        }
    });

    for (const subscribed_user of subscribed_users) {
        const user = await prisma.users.findFirst({
            where: { id: subscribed_user.user_id }
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
                subscribed_at: moment(subscribed_user.updated_at).unix()
            });
        }
    }

    return res.send({
        available: true,
        list: response
    });
}