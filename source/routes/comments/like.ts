import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";
import moment from "moment";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { id } = req.body;

    if (id) {
        const comment_control = await prisma.comments.findFirst({
            where: { snowflake: id }
        });

        if (comment_control) {
            const like_control = await prisma.comment_likes.findFirst({
                where: {
                    user_id: auth.id.toString(),
                    comment_id: comment_control.id.toString(),
                }
            });

            if (like_control) {
                await prisma.comment_likes.delete({
                    where: {
                        id: like_control.id
                    }
                });

                res.send({
                    status: false
                });
            } else {
                await prisma.comment_likes.create({
                    data: {
                        user_id: auth.id.toString(),
                        comment_id: comment_control.id.toString(),
                        date: moment().unix().toString()
                    }
                });

                res.send({
                    status: true
                });
            }
        } else {
            res.send({
                status: false
            });
        }
    } else {
        res.send({
            status: false
        });
    }
}