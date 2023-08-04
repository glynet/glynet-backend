import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { type } = req.params;
    const { username } = req.body;

    if (username && type) {
        const profile_data = await prisma.users.findFirst({
            where: {
                username: username.toString()
            }
        });

        if (profile_data) {
            if (profile_data.id !== auth.id) {
                const is_blocked = await prisma.blocks.findMany({
                    where: {
                        client_id: auth.id.toString(),
                        user_id: profile_data.id.toString(),
                        type: type === "block" ? "block" : "mute"
                    }
                });

                if (is_blocked.length !== 0) {
                    const remove = await prisma.blocks.deleteMany({
                        where: {
                            client_id: auth.id.toString(),
                            user_id: profile_data.id.toString(),
                            type: type === "block" ? "block" : "mute"
                        }
                    });

                    if (remove) {
                        return res.send({
                            status: "unblock"
                        });
                    } else {
                        return res.send({
                            status: "error"
                        });
                    }
                } else {
                    const add = await prisma.blocks.create({
                        data: {
                            client_id: auth.id.toString(),
                            user_id: profile_data.id.toString(),
                            type: type === "block" ? "block" : "mute",
                            timestamp: new Date()
                        }
                    });

                    if (add) {
                        return res.send({
                            status: "blocked"
                        });
                    }
                }
            }
        }
    }

    return res.send({
        status: "error"
    });
}
