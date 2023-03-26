import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";
import { UserList } from "../../models/post.model";
import { calculateUserFlags } from "../../services/flags";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { id } = req.body;

    if (id) {
        const comment_control = await prisma.comments.findFirst({
            where: { snowflake: id }
        });

        if (comment_control && comment_control.author_id === auth.id.toString()) {
            await prisma.comments.delete({
                where: { id: comment_control.id }
            });

            res.send({
                status: true
            });
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