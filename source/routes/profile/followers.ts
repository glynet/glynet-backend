import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";
import { calculateUserFlags } from "../../services/flags";
import { UserList } from "../../models/post.model";
import getUser from "../../helpers/getUser";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const params = req.query;
    const page = 20;
    
    if (params.username) {
        const profile_data = await prisma.users.findFirst({
            where: {
                username: params.username.toString()
            }
        });

        if (profile_data) {
            const response: UserList[] = [];
            
            const followers = await prisma.followings.findMany({
                skip: params["page"] ? Number(params["page"]) * page : 0,
                take: page,
                where: {
                    following_id: profile_data.id
                }
            });

            for (const follower of followers) {
                const user_data = await getUser(follower.follower_id);

                if (user_data.is_user_ready) {
                    const flags = calculateUserFlags(user_data.data.flags);

                    if (!(flags.includes("DELETED") || flags.includes("SELF_DELETED"))) {
                        const is_following = await prisma.followings.findFirst({
                            where: {
                                follower_id: auth.id,
                                following_id: follower.following_id,
                            }
                        });
                        
                        response.push({
                            user: user_data,
                            following: is_following ? is_following.accept.toString() === "1" ? "following" : "on_request" : "no_follow",
                        });
                    }
                }
            }

            return res.send({
                available: true,
                data: response
            });
        } else {
            return res.send({
                available: false,
                data: []
            });
        }
    }

    return res.send({
        available: false,
        data: []
    });
}