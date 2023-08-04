import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";
import { generateSnowflakeID } from "../../services/generator";
import moment from "moment";
import { increaseJots } from "../../services/jots";
import { Comment } from "../../models/comment.model";
import getUser from "../../helpers/getUser";

const prisma = new PrismaClient();

type CreateComment = {
    status: boolean;
    append?: Comment
}

export default async function handler(req: Request, res: Response<CreateComment>) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { post_id, content, reply_id, is_gif } = req.body;

    if (post_id && content) {
        const post_control = await prisma.posts.findMany({
            where: { snowflake: post_id.toString() }
        });

        if (post_control) {
            let reply_controlled_id: string = "0";
            let safe_text: string = "";

            if (content) {
                if (content.length <= 256) {
                    safe_text = content;
                }
            }

            if (reply_id) {
                const reply_control = await prisma.comments.findMany({
                    where: {
                        snowflake: reply_id.toString(),
                        post_id: post_control[0].id.toString()
                    }
                });

                if (!reply_control) {
                    return res.send({
                        status: false
                    });
                } else {
                    reply_controlled_id = reply_control[0].id.toString();
                }
            }

            const comment_snowflake = generateSnowflakeID();

            const create = await prisma.comments.create({
                data: {
                    snowflake: comment_snowflake,
                    author_id: auth.id.toString(),
                    content: safe_text,
                    replied_to: reply_controlled_id,
                    post_id: post_control[0].id.toString(),
                    type: "post",
                    flags: is_gif ? 8 : 0,
                    timestamp: moment().unix()
                }
            });

            if (create) {
                increaseJots(auth.id, 40);

                return res.send({
                    status: true,
                    append: {
                        id: comment_snowflake,
                        user: await getUser(auth.id),

                        content: content,
                        react_count: 0,
                        is_liked: false,

                        post_id: post_id,

                        replied_to: "",
                        replies: [],
                        reply_count: 0,

                        flags: is_gif ? 8 : 0,
                        timestamp: moment().unix()
                    }
                });
            }
        }
    }

    return res.send({
        status: false,
    });
}
