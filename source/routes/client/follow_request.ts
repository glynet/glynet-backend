import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";
import getUser from "../../helpers/getUser";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response) {
    const { user_id, accept } = req.body;

    const auth = await Auth(req, res);
    if (!auth) return;

    const user_control = await getUser(user_id, "snowflake", true)

    if (user_control.is_user_ready) {
        if (accept) {
            const update = await prisma.followings.updateMany({
                where: {
                    following_id: auth.id,
                    follower_id: parseInt(user_control.data.id)
                },
                data: {
                    accept: 1
                }
            })

            if (update) {
                return res.send({
                    status: true,
                    code: 0x0
                })
            }
        } else {
            const remove = await prisma.followings.deleteMany({
                where: {
                    following_id: auth.id,
                    follower_id: parseInt(user_control.data.id)
                }
            })

            if (remove) {
                return res.send({
                    status: true,
                    code: 0x1
                })
            }
        }
    }

    return res.send({
        status: false,
        code: 0x32
    })
}
