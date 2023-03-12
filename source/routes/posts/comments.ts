import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";
import moment from "moment";
import { Comment } from "../../models/comment.model";
import { generateSnowflakeID } from "../../services/generator";
import { increaseJots } from "../../services/jots";
import { calculateUserFlags, calculateCommentFlags } from "../../services/flags";
import { UserList } from "../../models/post.model";

const prisma = new PrismaClient();
const comments = express.Router();

comments.get("/", async function (req: Request, res: Response) {
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
                const comment_author = await prisma.users.findFirst({
                    where: {
                        id: Number(comment.author_id)
                    }
                });

                if (comment_author) {
                    const flags = calculateUserFlags(comment_author.flags);

                    if (!(flags.includes("DELETED") || flags.includes("SELF_DELETED"))) {
                        let reply_id: string = "0";

                        const is_liked = await prisma.comment_likes.findFirst({
                            where: {
                                user_id: auth.id.toString(),
                                comment_id: comment.id.toString(),
                            }
                        });

                        const likes = await prisma.comment_likes.findMany({
                            where: {
                                comment_id: comment.id.toString(),
                            }
                        });

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
                            user: {
                                id: comment_author.snowflake,
                                name: comment_author.name,
                                username: comment_author.username,
                                avatar: comment_author.avatar,
                                flags: Number(comment_author.flags)
                            },
                            comment: {
                                content: comment.content,
                                attachments: comment.attachments.length !== 0 ? comment.attachments.split(",") : [],
                                likes: {
                                    count: likes.length,
                                    is_liked: is_liked !== null
                                }
                            },
                            position: 0,
                            post_id: post_control[0].snowflake,
                            replied_to: reply_id,
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
});

comments.post("/new", async function (req: Request, res: Response) {
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
});

comments.get("/likes", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const params = req.query;

    if (params.q) {
        const response: UserList[] = [];
        
        const comment_control = await prisma.comments.findFirst({
            where: { snowflake: params.q.toString() }
        });

        if (comment_control && comment_control.flags === 0) {
            const likes = await prisma.comment_likes.findMany({
                where: { comment_id: comment_control.id.toString() }
            });

            if (likes) {
                for (const like of likes) {
                    const like_author = await prisma.users.findFirst({
                        where: { id: Number(like.user_id) }
                    });

                    if (like_author) {
                        const flags = calculateUserFlags(like_author.flags);

                        if (!(flags.includes("DELETED") || flags.includes("SELF_DELETED"))) {
                            const is_following = await prisma.followings.findFirst({
                                where: {
                                    follower_id: auth.id,
                                    following_id: like_author.id,
                                    accept: 1
                                }
                            });

                            response.push({
                                user: {
                                    id: like_author.snowflake,
                                    name: like_author.name,
                                    username: like_author.username,
                                    avatar: like_author.avatar,
                                    flags: like_author.flags
                                },
                                following: is_following !== null,
                                timestamp: Number(like.date)
                            })
                        }
                    }
                }
            }

            return res.send({
                status: true,
                list: response
            })
        }
    }
    
    return res.send({
        status: false
    });
});

comments.post("/like", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { id } = req.body;

    if (id) {
        const comment_control = await prisma.comments.findFirst({
            where: { snowflake: id }
        });

        if (comment_control) {
            const like_control = await prisma.comment_likes.findFirst({
                where: {
                    user_id: auth.id.toString(),
                    comment_id: comment_control.id.toString(),
                }
            });

            if (like_control) {
                await prisma.comment_likes.delete({
                    where: {
                        id: like_control.id
                    }
                });

                res.send({
                    status: false
                });
            } else {
                await prisma.comment_likes.create({
                    data: {
                        user_id: auth.id.toString(),
                        comment_id: comment_control.id.toString(),
                        date: moment().unix().toString()
                    }
                });

                res.send({
                    status: true
                });
            }
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
});

comments.delete("/delete", async function (req: Request, res: Response) {
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
});

export default comments;
