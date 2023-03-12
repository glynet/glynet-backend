import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";
import { findContentType } from "../../services/utils";
import moment from "moment";
import { calculateUserFlags } from "../../services/flags";

const prisma = new PrismaClient();
const notifications = express.Router();

enum NotificationTypes {
    all_notifications,
    only_posts,
    never
}

notifications.get("/", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const response: any[] = [];

    const get_notifications = await prisma.notifications.findMany({
        take: 50,
        where: {
            user_id: auth.id.toString()
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
                                                    avatar: postAuthor.avatar,
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
                                                    avatar: user.avatar,
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
                                                    avatar: postAuthor.avatar,
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
                                                    avatar: user.avatar,
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
                                                avatar: postAuthor.avatar,
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
                        avatar: user.avatar,
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
        list: response
    });
});

notifications.get("/subscribed", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const response: any[] = [];

    const subscribed_users = await prisma.user_notifications.findMany({
        where: {
            author_id: auth.id,
            type: "all_notifications"
        }
    });

    for (const subscribed_user of subscribed_users) {
        const user = await prisma.users.findFirst({
            where: { id: subscribed_user.user_id }
        });

        if (user) {
            response.push({
                user: {
                    id: user.snowflake,
                    name: user.name,
                    username: user.username,
                    avatar: user.avatar,
                    flags: user.flags
                },
                subscribed_at: moment(subscribed_user.updated_at).unix()
            });
        }
    }

    return res.send({
        available: true,
        list: response
    });
});

notifications.post("/update_user", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { user_id, type } = req.body;

    if (user_id && type) {
        if (NotificationTypes[type] !== undefined) {
            const user = await prisma.users.findFirst({
                where: { snowflake: user_id }
            });

            if (user) {
                const tableControl = await prisma.user_notifications.findMany({
                    where: {
                        author_id: auth.id,
                        user_id: user.id
                    }
                });

                if (tableControl.length !== 0) {
                    // update
                    const update = await prisma.user_notifications.updateMany({
                        where: {
                            author_id: auth.id,
                            user_id: user.id,
                        },
                        data: {
                            type: type,
                            updated_at: new Date()
                        }
                    });

                    return res.send({
                        status: true
                    });
                } else {
                    // create
                    const create = await prisma.user_notifications.create({
                        data: {
                            author_id: auth.id,
                            user_id: user.id,
                            type: type,
                            updated_at: new Date()
                        }
                    });

                    return res.send({
                        status: true
                    });
                }
            }
        }
    }

    return res.send({
        status: false
    });
});

export default notifications;