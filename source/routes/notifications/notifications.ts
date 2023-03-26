import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";
import getAvatar from "../../helpers/getAvatar";
import { findContentType } from "../../services/utils";
import { getPrivacyDetails } from "../../services/get-privacy";
import { calculateUserFlags } from "../../services/flags";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const privacy = await getPrivacyDetails(auth.id);

    const response: any[] = [];

    const get_notifications = await prisma.notifications.findMany({
        take: 50,
        where: {
            user_id: auth.id.toString()
        },
        orderBy: {
            id: "desc"
        }
    });

    for (const notification of get_notifications) {        
        const details = notification.data as any;
        let extend: any = {};

        const user = await prisma.users.findFirst({
            where: {
                id: Number(details.user)
            }
        });

        if (user) {
            const flags = calculateUserFlags(user.flags);

            if (!(flags.includes("DELETED") || flags.includes("SELF_DELETED"))) {
                switch (notification.type) {
                    case "reply":
                        if (details.id) {
                            const reply = await prisma.comments.findFirst({
                                where: { id: Number(details.id) }
                            });

                            if (reply) {
                                const comment = await prisma.comments.findFirst({
                                    where: { id: Number(details.id) }
                                });

                                if (comment) {
                                    const postAuthor = await prisma.users.findFirst({
                                        where: { id: Number(comment.author_id) }
                                    });

                                    if (postAuthor) {
                                        extend = {
                                            post: {
                                                content: {
                                                    attachment: comment.attachments.length !== 0 && comment.attachments.split(",")[0],
                                                    text: comment.content,
                                                    type: findContentType(comment.attachments.split(",")[0])
                                                },
                                                author: {
                                                    id: postAuthor.snowflake,
                                                    name: postAuthor.name,
                                                    username: postAuthor.username,
                                                    avatar: await getAvatar(postAuthor),
                                                    flags: postAuthor.flags
                                                }
                                            },
                                            comment: {
                                                content: {
                                                    text: reply.content,
                                                },
                                                author: {
                                                    id: user.snowflake,
                                                    name: user.name,
                                                    username: user.username,
                                                    avatar: await getAvatar(user),
                                                    flags: user.flags
                                                }
                                            },
                                        };
                                    }
                                }
                            }
                        }
                        break;

                    case "comment":
                    case "like_comment":
                        if (details.id) {
                            const comment = await prisma.comments.findFirst({
                                where: { id: Number(details.id) }
                            });

                            if (comment) {
                                const post = await prisma.posts.findFirst({
                                    where: { id: Number(comment.post_id) }
                                });

                                if (post) {
                                    const postAuthor = await prisma.users.findFirst({
                                        where: { id: post.author_id }
                                    });

                                    if (postAuthor) {
                                        extend = {
                                            post: {
                                                content: {
                                                    attachment: post.attachments.length !== 0 && post.attachments.split(",")[0],
                                                    text: post.content,
                                                    type: findContentType(post.attachments.split(",")[0])
                                                },
                                                author: {
                                                    id: postAuthor.snowflake,
                                                    name: postAuthor.name,
                                                    username: postAuthor.username,
                                                    avatar: await getAvatar(postAuthor),
                                                    flags: postAuthor.flags
                                                }
                                            },
                                            comment: {
                                                content: {
                                                    text: comment.content,
                                                },
                                                author: {
                                                    id: user.snowflake,
                                                    name: user.name,
                                                    username: user.username,
                                                    avatar: await getAvatar(user),
                                                    flags: user.flags
                                                }
                                            },
                                        };
                                    }
                                }
                            }
                        }
                        break;

                    case "like_post":
                    case "new_post":
                    case "mention_post":
                    case "quote_post":
                        if (details.id) {
                            const post = await prisma.posts.findFirst({
                                where: { id: Number(details.id) }
                            });

                            if (post) {
                                const postAuthor = await prisma.users.findFirst({
                                    where: { id: post.author_id }
                                });

                                if (postAuthor) {
                                    extend = {
                                        post: {
                                            content: {
                                                attachment: post.attachments.length !== 0 && post.attachments.split(",")[0],
                                                text: post.content,
                                                type: findContentType(post.attachments.split(",")[0])
                                            },
                                            author: {
                                                id: postAuthor.snowflake,
                                                name: postAuthor.name,
                                                username: postAuthor.username,
                                                avatar: await getAvatar(postAuthor),
                                                flags: postAuthor.flags
                                            }
                                        }
                                    };
                                }
                            }
                        }
                        break;
                }

                response.push({
                    id: notification.id,
                    from: {
                        id: user.snowflake,
                        name: user.name,
                        username: user.username,
                        avatar: await getAvatar(user),
                        flags: user.flags
                    },
                    details: {
                        type: notification.type,
                        extend
                    },
                    timestamp: Number(notification.timestamp)
                });
            }
        }
    }

    res.send({
        available: true,
        follow_requests: {
            is_private: privacy.is_private,
            count: await prisma.followings.count({
                where: {
                    following_id: auth.id,
                    accept: 0
                }
            })
        },
        list: response
    });
}