import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";
import moment from "moment";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response<{ like_entry: boolean }>) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { id } = req.body;

    if (id) {
        const post_control = await prisma.posts.findFirst({
            where: {
                snowflake: id.toString()
            },
            select: {
                id: true
            }
        });

        if (post_control) {
            const like_control = await prisma.likes.findFirst({
                where: {
                    user_id: Number(auth.id),
                    post_id: Number(post_control.id),
                },
                select: {
                    id: true
                }
            });

            if (like_control) {
                // like var
                await prisma.likes.deleteMany({
                    where: {
                        user_id: Number(auth.id),
                        post_id: Number(post_control.id),
                    }
                })
            } else {
                await prisma.likes.create({
                    data: {
                        user_id: Number(auth.id),
                        post_id: Number(post_control.id),
                        date: moment().unix().toString(),
                    }
                })

                return res.send({
                    like_entry: true,
                });
            }
        }
    }

    return res.send({
        like_entry: false,
    });
}