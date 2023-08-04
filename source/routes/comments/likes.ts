import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";
import { UserList } from "../../models/post.model";
import { calculateUserFlags } from "../../services/flags";
import getUser from "../../helpers/getUser";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const params = req.query;

    if (params.q) {
        const response: UserList[] = [];

        const comment_control = await prisma.comments.findFirst({
            where: { snowflake: params.q.toString() }
        });

        if (comment_control) {
            const likes = await prisma.comment_likes.findMany({
                where: { comment_id: comment_control.id.toString() }
            });

            if (likes) {
                for (const like of likes) {
                    const like_author = await getUser(Number(like.user_id))

                    if (like_author.is_user_ready) {
                        const flags = calculateUserFlags(like_author.data.flags);

                        if (!(flags.includes("DELETED") || flags.includes("SELF_DELETED"))) {
                            const is_following = await prisma.followings.findFirst({
                                where: {
                                    follower_id: auth.id,
                                    following_id: Number(like.user_id)
                                }
                            });

                            response.push({
                                user: like_author,
                                following: is_following ? is_following.accept.toString() === "1" ? "following" : "on_request" : "no_follow",
                            })
                        }
                    }
                }
            }

            return res.send({
                available: true,
                data: response
            })
        }
    }

    return res.send({
        available: false
    });
}
