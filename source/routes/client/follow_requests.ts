import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";
import getAvatar from "../../helpers/getAvatar";
import { calculateUserFlags } from "../../services/flags";
import getUser from "../../helpers/getUser";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const response: any[] = []

    const requests = await prisma.followings.findMany({
        where: {
            following_id: auth.id,
            accept: 0
        }
    })

    for (const request of requests) {
        const user_data = await getUser(request.follower_id);

        if (user_data.is_user_ready) {
            const flags = calculateUserFlags(user_data.data.flags);

            if (!(flags.includes("DELETED") || flags.includes("SELF_DELETED"))) {
                response.push({
                    user: user_data
                })
            }
        }
    }

    return res.send({
        available: true,
        data: response
    });
}
