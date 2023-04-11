import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { Post } from "../../models/post.model";
import Auth from "../../services/auth";
import { getPrivacyDetails } from "../../services/get-privacy";
import getAttachments from "../../helpers/getAttachments";
import getUser from "../../helpers/getUser";
import moment from "moment";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const params = req.query;
    const response: Post[] = [];
    const take: number = 15;
    const skip = params["skip"] ? Number(params["skip"]) * take : 0;

    let where: any = {};

    const throwError = (code: number, message: string): Response => {
        return res.send({
            is_entries_available: false,
            timeline: [],
            error_code: code,
            error_message: message,
        });
    }

    if (params.loop_only === "1") {
        // LOOP
        switch (params.collect) {
            case "profile":
                const user_control = await prisma.users.findFirst({
                    where: {
                        username: (params.username as string)
                    }
                });
    
                if (user_control && params.username !== undefined) {
                    const privacy = await getPrivacyDetails(user_control.id);
    
                    if (privacy.is_private && auth.id !== user_control.id) {
                        const is_following = await prisma.followings.findFirst({
                            where: {
                                follower_id: auth.id,
                                following_id: user_control.id,
                                accept: 1
                            }
                        });
    
                        if (is_following !== null) {
                            where = {
                                author_id: Number(user_control.id),
                                is_loop: true
                            }
                        } else {
                            return throwError(64, "To view this profile, you must first follow it.");        
                        }
                    } else {
                        where = {
                            author_id: Number(user_control.id),
                            is_loop: true
                        }
                    }
                } else {
                    return throwError(32, "The profile unavailable.");
                }
                break;
    
            case "post":
                if (params["loop_id"]) {
                    where = {
                        snowflake: params.loop_id.toString()
                    }
                } else {
                    return throwError(128, "The post unavailable");
                }
                break;
    
            case "feed":
                const followings = await prisma.followings.findMany({
                    where: {
                        follower_id: Number(auth.id),
                        accept: 1
                    }
                });
                let ids = followings.map(m=> Number(m.following_id))
                ids.push(auth.id);
    
                where = {
                    author_id: {
                        in: ids,
                    },
                    is_loop: true
                }
                break;
    
            case "explore":
            default:
                where = {
                    is_loop: true
                }
                break;
        }
    } else {
        // POST
        switch (params.collect) {
            case "profile":
                const user_control = await prisma.users.findFirst({
                    where: {
                        username: (params.username as string)
                    }
                });

                if (user_control && params.username !== undefined) {
                    const privacy = await getPrivacyDetails(user_control.id);

                    if (privacy.is_private && auth.id !== user_control.id) {
                        const is_following = await prisma.followings.findFirst({
                            where: {
                                follower_id: auth.id,
                                following_id: user_control.id,
                                accept: 1
                            }
                        });

                        if (is_following !== null) {
                            where = {
                                author_id: Number(user_control.id)
                            }
                        } else {
                            return throwError(64, "To view this profile, you must first follow it.");        
                        }
                    } else {
                        where = {
                            author_id: Number(user_control.id)
                        }
                    }
                } else {
                    return throwError(32, "The profile unavailable.");
                }
                break;

            case "location":
                if (params["q"]) {
                    where = {
                        location: {
                            contains: params.q.toString()
                        },
                        is_loop: false
                    }
                } else {
                    return throwError(128, "The location unavailable");
                }
                break;

            case "likes":
                const likes = await prisma.likes.findMany({
                    skip: params["skip"] ? Number(params["skip"]) * take : 0,
                    take: take,
                    where: {
                        user_id: auth.id,
                    }
                });

                if (likes.length < 1) {
                    return throwError(256, "Likes yok");
                }
                
                where = {
                    id: { in: likes.map(m=> Number(m.post_id)) }
                }
                break;

            case "bookmarks":
                const bookmarks = await prisma.bookmarks.findMany({
                    where: {
                        user: auth.id.toString(),
                    }
                });

                if (bookmarks.length < 1) {
                    return throwError(256, "Bookmark yok");
                }

                where = {
                    id: { in: bookmarks.map(m=> Number(m.post))}                
                }
                break;

            case "hashtag":
                if (params["q"]) {
                    where = {
                        content: {
                            contains: `#${params.q.toString()}`
                        },
                        is_loop: false
                    }
                } else {
                    return throwError(128, "The hashtag unavailable");
                }
                break;

            case "post":
                if (params["q"]) {
                    where = {
                        snowflake: params.q.toString(),
                    }
                } else {
                    return throwError(128, "The post unavailable");
                }
                break;

            case "feed":
            default:
                const followings = await prisma.followings.findMany({
                    where: {
                        follower_id: Number(auth.id),
                        accept: 1,
                    }
                });
                let ids = followings.map(m=> Number(m.following_id))
                ids.push(auth.id);

                where = {
                    author_id: {
                        in: ids
                    },
                    // is_loop: false
                }
                break;
        }
    }

    const posts = await prisma.posts.findMany({
        skip,
        take: take,
        where: where,
        orderBy: {
            id: "desc"
        }
    });

    for (const post of posts) {
        const author = await getUser(post.author_id);

        if (author.is_user_ready) {
            const is_liked = await prisma.likes.count({
                where: {
                    user_id: auth.id,
                    post_id: post.id,
                }
            });

            const is_marked = await prisma.bookmarks.count({
                where: {
                    user: auth.id.toString(),
                    post: post.id.toString(),
                }
            });

            response.push({
                id: post.snowflake,
                publisher: author,

                is_loop: post.is_loop,

                full_text: post.content,
                text_range: [0, post.content.length],

                published_at_str: moment.unix(Number(post.created_at)).toDate().toString(),
                published_at_unix: Number(post.created_at),
                
                edited_at_str: moment(post.updated_at).toDate().toString(),
                edited_at_unix: moment(post.updated_at).unix(),

                coordinates: null,
                place: post.location.length !== 0 ? post.location : null,

                is_entry_archived: post.archived,
                sensitive_content: false,

                media_attachments: await getAttachments(author.data, post.attachments),

                metrics: {
                    like_count: await prisma.likes.count({
                        where: {
                            post_id: post.id
                        }
                    }),
                    reply_count: await prisma.comments.count({
                        where: {
                            post_id: post.id.toString()
                        }
                    }),
                    save_count: await prisma.bookmarks.count({
                        where: {
                            post: post.id.toString(),
                        }
                    }),
                    qoute_count: 0,
                },

                is_liked: is_liked !== 0,
                is_saved: is_marked !== 0,

                tags: post.content.split(" ").filter(v=> v.startsWith("#")),
                poll: null,

                is_muted: false,
                language: "tr",
                visibility: "public"
            })
        }
    }

    return res.send({
        is_entries_available: true,
        timeline: response,
        error_code: 0,
        skipped_index: skip
    });
}