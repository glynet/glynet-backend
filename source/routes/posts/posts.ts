import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { Post, UserList } from "../../models/post.model";
import moment from "moment";
import Auth from "../../services/auth";
import { generateSnowflakeID } from "../../services/generator";
import { importFiles } from "../../services/import-files";
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 32000000,
    },
    fileFilter: (req: Request, file: any, cb: any) => {
        if (
            !file.originalname.match(
                /\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|mp4|MP4)$/
            )
        )
            return cb(null, false);

        cb(null, true);
    },
});

const prisma = new PrismaClient();
const posts = express.Router();

posts.get("/", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const params = req.query;
    const response: Post[] = [];
    const page: number = 15;
    let where: any = {};

    function throwError(code: number, message: string): void {
        res.status(404).send({
            status: false,
            code,
            message,
        });
    }

    switch (params.w) {
        case "profile":
            const user_control = await prisma.users.findFirst({
                where: {
                    username: (params.username as string)
                }
            });

            if (user_control && params.username !== undefined) {
                where = {
                    author_id: Number(user_control.id)
                }
            } else {
                return throwError(32, "The profile unavailable");
            }
            break;

        case "location":
            if (params["q"]) {
                where = {
                    location: {
                        contains: params.q.toString()
                    }
                }
            } else {
                return throwError(128, "The location unavailable");
            }
            break;

        case "likes":
            const likes = await prisma.likes.findMany({
                skip: params["page"] ? Number(params["page"]) * page : 0,
                take: page,
                where: {
                    user_id: auth.id
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
                    }
                }
            } else {
                return throwError(128, "The hashtag unavailable");
            }
            break;

        case "post":
            if (params["q"]) {
                where = {
                    snowflake: params.q.toString()
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
                    accept: 1
                }
            });
            let ids = followings.map(m=> Number(m.following_id))
            ids.push(auth.id);

            where = {
                author_id: {
                    in: ids
                }
            }
            break;
    }

    const posts = await prisma.posts.findMany({
        skip: params["page"] ? Number(params["page"]) * page : 0,
        take: page,
        where: where,
        orderBy: {
            id: "desc"
        }
    });

    for (const post of posts) {
        const author = await prisma.users.findFirst({
            where: {
                id: post.author_id
            }
        });

        if (author) {
            const likes = await prisma.likes.count({
                where: {
                    post_id: post.id
                }
            });

            const is_liked = await prisma.likes.count({
                where: {
                    user_id: auth.id,
                    post_id: post.id
                }
            });

            const is_marked = await prisma.bookmarks.count({
                where: {
                    user: auth.id.toString(),
                    post: post.id.toString()
                }
            });

            response.push({
                id: post.snowflake,
                archived: post.archived,
                author: {
                    id: author.snowflake,
                    name: author.name,
                    username: author.username,
                    avatar: author.avatar,
                    flags: Number(author.flags),
                },
                content: {
                    text: post.content,
                    attachments: post.attachments.split(","),
                    location: post.location,
                    timestamp: Number(post.created_at),
                    details: {
                        likes: {
                            is_liked: is_liked !== 0,
                            count: likes,
                        },
                        is_bookmarked: is_marked !== 0,
                        comments: 0
                    }
                }
            });
        }
    }

    res.json({
        status: true,
        code: 0,
        list: response
    });
});

posts.get("/likes", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const params = req.query;

    if (params.q) {
        const response: UserList[] = [];

        const post_control = await prisma.posts.findFirst({
            where: {
                snowflake: params.q.toString()
            }
        });

        if (post_control) {
            const likes = await prisma.likes.findMany({
                where: {
                    post_id: post_control.id,
                },
                orderBy: {
                    id: "desc"
                }
            });

            for (const like of likes) {
                const author = await prisma.users.findUnique({
                    where: {
                        id: like.user_id
                    }
                });

                if (author) {
                    const is_following = await prisma.followings.findFirst({
                        where: {
                            follower_id: auth.id,
                            following_id: author.id,
                            accept: 1
                        }
                    });

                    response.push({
                        user: {
                            id: author.snowflake,
                            name: author.name,
                            username: author.username,
                            avatar: author.avatar,
                            flags: Number(author.flags),
                        },
                        following: is_following !== null,
                        timestamp: Number(like.date),
                    })
                }
            }

            res.send({
                status: true,
                list: response,
            });
        } else {
            res.status(404).send({
                status: false
            });
        }
    } else {
        res.status(404).send({
            status: false
        });
    }
});

posts.post("/like", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { id } = req.body;

    if (id) {
        const post_control = await prisma.posts.findFirst({
            where: {
                snowflake: id.toString()
            }
        });

        if (post_control) {
            const like_control = await prisma.likes.findFirst({
                where: {
                    user_id: Number(auth.id),
                    post_id: Number(post_control.id),
                }
            });

            if (like_control) {
                // like var
                await prisma.likes.deleteMany({
                    where: {
                        user_id: Number(auth.id),
                        post_id: Number(post_control.id),
                    }
                })

                res.send({
                    status: false,
                });
            } else {
                await prisma.likes.create({
                    data: {
                        user_id: Number(auth.id),
                        post_id: Number(post_control.id),
                        date: moment().unix().toString(),
                    }
                })

                res.send({
                    status: true,
                });
            }
        } else {
            res.send({
                status: false,
            });
        }
    } else {
        res.send({
            status: false,
        });
    }
});

posts.post("/save", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { id } = req.body;

    if (id) {
        const post_control = await prisma.posts.findFirst({
            where: {
                snowflake: id.toString()
            }
        });

        if (post_control) {
            const save_control = await prisma.bookmarks.findFirst({
                where: {
                    user: auth.id.toString(),
                    post: post_control.id.toString(),
                }
            });

            if (save_control) {
                await prisma.bookmarks.deleteMany({
                    where: {
                        user: auth.id.toString(),
                        post: post_control.id.toString(),
                    }
                })

                res.send({
                    status: false,
                });
            } else {
                await prisma.bookmarks.create({
                    data: {
                        user: auth.id.toString(),
                        post: post_control.id.toString(),
                        date: moment().unix().toString(),
                    }
                })

                res.send({
                    status: true,
                });
            }
        } else {
            res.send({
                status: false,
            });
        }
    } else {
        res.send({
            status: false,
        });
    }
});

posts.post("/create", upload.array("file", 10), async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { content, location } = req.body;
    let attachments: any = "";
    if (content) {
        const snowflake = generateSnowflakeID();
        let safe_location: string = "";

        if (location && location.length <= 64) {
            safe_location = location;
        }

        if ((req.files as any).length === 0 && content === "") {
            return res.send({
                status: "empty_fields"
            });
        }
        if ((req.files as any).length !== 0) {
            const importer = await importFiles(req.files, `./attachments/${auth.snowflake}/posts/${snowflake}/`);

            if (importer.error === 93093)
                return res.send({error: 93093, status: 'too_high_file_size'});

            attachments = importer.filePaths;
        }
        
        const create = await prisma.posts.create({
            data: {
                snowflake: snowflake,
                author_id: auth.id,
                content: content,
                attachments: attachments,
                created_at: moment().unix().toString(),
                updated_at: new Date(),
                location: safe_location,
                archived: false
            }
        });
        
        

       
        console.log(attachments);
        if (create) {
            return res.send({
                status: true,
                id: snowflake
            });
        }
    }

    return res.send({
        status: false,
    });
});

posts.delete("/delete", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { id } = req.body;

    if (id) {
        const post_control = await prisma.posts.findFirst({
            where: {
                snowflake: id.toString()
            }
        });

        if (post_control) {
            if (post_control.author_id === auth.id) {
                const delete_post = await prisma.posts.delete({
                    where: {
                        id: post_control.id,
                    }
                });

                if (delete_post) {
                    res.send({
                        status: true,
                    });
                } else {
                    res.send({
                        status: false,
                    });
                }
            } else {
                res.send({
                    status: false,
                });
            }
        } else {
            res.send({
                status: false,
            });
        }
    } else {
        res.send({
            status: false,
        });
    }
});

export default posts;
