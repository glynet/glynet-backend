import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";

const prisma = new PrismaClient();

enum NotificationTypes {
    all_notifications,
    only_posts,
    never
}

export default async function handler(req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { user_id, type } = req.body;

    if (user_id && type) {
        if (NotificationTypes[type] !== undefined) {
            const user = await prisma.users.findFirst({
                where: { snowflake: user_id }
            });

            if (user) {
                const tableControl = await prisma.user_notifications.findMany({
                    where: {
                        author_id: auth.id,
                        user_id: user.id
                    }
                });

                if (tableControl.length !== 0) {
                    // update
                    const update = await prisma.user_notifications.updateMany({
                        where: {
                            author_id: auth.id,
                            user_id: user.id,
                        },
                        data: {
                            type: type,
                            updated_at: new Date()
                        }
                    });

                    return res.send({
                        status: true
                    });
                } else {
                    // create
                    const create = await prisma.user_notifications.create({
                        data: {
                            author_id: auth.id,
                            user_id: user.id,
                            type: type,
                            updated_at: new Date()
                        }
                    });

                    return res.send({
                        status: true
                    });
                }
            }
        }
    }

    return res.send({
        status: false
    });
}