import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";
import { generateSnowflakeID } from "../../services/generator";
import moment from "moment";
import { increaseJots } from "../../services/jots";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { post_id, content, reply_id, gif_url } = req.body;

    if (post_id && (content || gif_url)) {
        const post_control = await prisma.posts.findMany({
            where: { snowflake: post_id.toString() }
        });

        if (post_control) {
            let reply_controlled_id: string = "0";
            let safe_gif_url: string = "";
            let safe_text: string = "";

            if (gif_url) {
                // gerçekten url mi kontrol edilecek
                safe_gif_url = gif_url;
            }

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
                    attachments: safe_gif_url,
                    replied_to: reply_controlled_id,
                    post_id: post_control[0].id.toString(),
                    type: "post",
                    flags: 0,
                    timestamp: moment().unix()
                }
            });

            if (create) {
                increaseJots(auth.id, 40);

                return res.send({
                    status: true,
                    append: {
                        id: comment_snowflake,
                        user: {
                            id: auth.snowflake,
                            name: auth.name,
                            username: auth.username,
                            avatar: auth.avatar,
                            flags: Number(auth.flags)
                        },
                        comment: {
                            content: content,
                            attachments: safe_gif_url.length !== 0 ? [safe_gif_url] : [],
                            likes: {
                                count: 0,
                                is_liked: false
                            }
                        },
                        position: 0,
                        post_id: post_id,
                        replied_to: reply_controlled_id,
                        flags: 0,
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