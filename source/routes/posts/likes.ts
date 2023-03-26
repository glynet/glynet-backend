import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";
import { UserList } from "../../models/post.model";
import getUser from "../../helpers/getUser";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const params = req.query;
    const page = 20;
    if (params.q) {
        const response: UserList[] = [];

        const post_control = await prisma.posts.findFirst({
            where: {
                snowflake: params.q.toString()
            }
        });

        if (post_control) {
            const likes = await prisma.likes.findMany({
                skip: params["page"] ? Number(params["page"]) * page : 0,
                take: page,
                where: {
                    post_id: post_control.id,
                },
                orderBy: {
                    id: "desc"
                }
            });            

            for (const like of likes) {
                const author = await getUser(like.user_id);

                if (author) {
                    const is_following = await prisma.followings.findFirst({
                        where: {
                            follower_id: auth.id,
                            following_id: like.user_id,
                        }
                    });

                    response.push({
                        user: author,
                        following: is_following ? is_following.accept.toString() === "1" ? "following" : "on_request" : "no_follow",
                    })
                }
            }

            res.send({
                available: true,
                data: response,
            });
        } else {
            return res.send({
                available: false,
                data: []
            });
        }
    } else {
        return res.send({
            available: false,
            data: []
        });
    }
}