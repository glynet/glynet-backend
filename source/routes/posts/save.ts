import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";
import moment from "moment";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response<{ save_entry: boolean }>) {
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
            const save_control = await prisma.bookmarks.findFirst({
                where: {
                    user: auth.id.toString(),
                    post: post_control.id.toString(),
                },
                select: {
                    id: true
                }
            });

            if (save_control) {
                await prisma.bookmarks.deleteMany({
                    where: {
                        user: auth.id.toString(),
                        post: post_control.id.toString(),
                    }
                })
            } else {
                await prisma.bookmarks.create({
                    data: {
                        user: auth.id.toString(),
                        post: post_control.id.toString(),
                        date: moment().unix().toString(),
                    }
                })

                return res.send({
                    save_entry: true,
                });
            }
        }
    } 

    return res.send({
        save_entry: false,
    });
}