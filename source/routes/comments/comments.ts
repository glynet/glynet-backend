import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";
import { Comment, Reply } from "../../models/comment.model";
import { calculateUserFlags } from "../../services/flags";
import getUser from "../../helpers/getUser";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { post, reply } = req.query;

    if (post) {
        const post_control = await prisma.posts.findMany({
            where: {
                snowflake: post.toString(),
            }
        });

        if (post_control.length !== 0) {
            const response: Comment[] = [];
            let comment_query = {};

            if (reply) {
                const reply_control = await prisma.comments.findMany({
                    where: {
                        snowflake: reply.toString(),
                    }
                });

                if (reply_control) {
                    comment_query = {
                        post_id: post_control[0].id.toString(),
                        replied_to: reply_control[0].id.toString(),
                    };
                } else {
                    res.send({
                        available: false
                    });
                }
            } else {
                comment_query = {
                    post_id: post_control[0].id.toString(),
                    replied_to: "0",
                };
            }

            const get_comments = await prisma.comments.findMany({
                // take: 50,
                where: comment_query,
                orderBy: {
                    id: "desc"
                }
            });

            for (const comment of get_comments) {
                const comment_author = await getUser(comment.author_id)

                if (comment_author.is_user_ready) {
                    const flags = calculateUserFlags(comment_author.data.flags);

                    if (!(flags.includes("DELETED") || flags.includes("SELF_DELETED"))) {
                        let reply_id: string = "0";
                        let replies: Reply[] = [];

                        const is_liked = await prisma.comment_likes.findFirst({
                            where: {
                                user_id: auth.id.toString(),
                                comment_id: comment.id.toString(),
                            }
                        });

                        const likes = await prisma.comment_likes.count({
                            where: {
                                comment_id: comment.id.toString(),
                            }
                        });

                        const replies_count = await prisma.comments.count({
                            where: {
                                replied_to: comment.id.toString(),
                            }
                        });

                        if (replies_count !== 0) {
                            const get_reply = await prisma.comments.findFirst({
                                where: {
                                    replied_to: comment.id.toString(),
                                }
                            });

                            if (get_reply) {
                                const reply_author = await getUser(get_reply.author_id);

                                if (reply_author) {
                                    replies.push({
                                        id: get_reply.snowflake,
                                        user: reply_author,
                                        comment: {
                                            content: get_reply.content
                                        },
                                        timestamp: get_reply.timestamp
                                    })
                                }
                            }
                        }

                        if (comment.replied_to !== "0") {
                            const find_reply_id = await prisma.comments.findFirst({
                                where: {
                                    id: Number(comment.replied_to),
                                }
                            });

                            if (find_reply_id) {
                                reply_id = find_reply_id.snowflake;
                            }
                        }

                        response.push({
                            id: comment.snowflake,
                            user: comment_author,

                            content: comment.content,
                            react_count: likes,
                            is_liked: is_liked !== null,

                            post_id: post_control[0].snowflake,

                            replied_to: reply_id, // count
                            replies: replies,
                            reply_count: replies_count,

                            flags: Number(comment.flags),
                            timestamp: Number(comment.timestamp)
                        });
                    }
                }
            }

            res.send({
                available: true,
                comments: response,
            });
        } else {
            res.send({
                available: false
            });
        }
    } else {
        res.send({
            available: false
        });
    }
}
