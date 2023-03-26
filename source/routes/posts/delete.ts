import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response<{
    delete_entry: boolean;
    error_code: number
}>) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { id } = req.body;

    if (id) {
        const post_control = await prisma.posts.findFirst({
            where: {
                snowflake: id.toString()
            },
            select: {
                id: true,
                author_id: true
            }
        });

        if (post_control) {
            if (post_control.author_id === auth.id) {
                const delete_post = await prisma.posts.delete({
                    where: {
                        id: post_control.id,
                    }
                });

                if (delete_post) {
                    return res.send({
                        delete_entry: true,
                        error_code: 0x0,
                    });
                } else {
                    return res.send({
                        delete_entry: false,
                        error_code: 0x4,
                    });
                }
            } else {
                return res.send({
                    delete_entry: false,
                    error_code: 0x3,
                });
            }
        } else {
            return res.send({
                delete_entry: false,
                error_code: 0x2,
            });
        }
    }

    return res.send({
        delete_entry: false,
        error_code: 0x1,
    });
}