import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const remove = await prisma.bookmarks.deleteMany({
        where: {
            user: auth.id.toString()
        }
    });

    if (remove) {
        return res.send({
            deleted_many_entries: true,
        });
    }

    return res.send({
        deleted_many_entries: false
    });
}