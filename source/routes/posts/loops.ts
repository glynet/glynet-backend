import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";
import getAttachments from "../../helpers/getAttachments";
import getUser from "../../helpers/getUser";
import { Audio } from "../../models/post.model";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { audio_id } = req.query;

    if (audio_id) {
        const audio_control = await prisma.attachments.findFirst({
            where: {
                snowflake: audio_id.toString()
            },
            orderBy: {
                id: "asc"
            }
        });

        if (audio_control) {
            let response: Audio[] = [];

            let where_query = {
                OR: [
                    { id: audio_control.id },
                    { audio: audio_control.id.toString() }
                ]
            }

            const count = await prisma.attachments.count({
                where: where_query
            });

            const using_by = await prisma.attachments.findMany({
                where: where_query
            });

            for (const audio_item of using_by) {
                if (audio_item.external_id !== 0) {
                    const post_snowflake = await prisma.posts.findFirst({
                        where: {
                            id: audio_item.external_id
                        },
                        select: {
                            snowflake: true
                        }
                    });

                    const publisher = await getUser(audio_item.user);

                    if (publisher.is_user_ready && post_snowflake) {
                        response.push({
                            entry_id: post_snowflake.snowflake,
                            attachment_id: audio_item.snowflake,
                            publisher,
                            attachments: await getAttachments(publisher.data, audio_item.id.toString())
                        })
                    }
                }
            }

            return res.send({
                available: true,
                data: response,
                total_data_length: count,
            });
        }
    }

    return res.send({
        available: false,
        data: [],
        total_data_length: 0
    });
}