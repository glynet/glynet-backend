import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";
import { FollowResponse } from "../../models/profile.model";
import { getPrivacyDetails } from "../../services/get-privacy";
import moment from "moment";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response<{ status: FollowResponse }>) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { username } = req.body;

    if (username) {
        const profile_data = await prisma.users.findFirst({
            where: {
                username: username.toString()
            }
        });

        if (profile_data) {
            if (profile_data.id === auth.id) {
                console.log("hata 3");
                res.send({
                    status: "error"
                });
            } else {
                const is_following = await prisma.followings.findFirst({
                    where: {
                        follower_id: auth.id,
                        following_id: profile_data.id
                    }
                });

                if (is_following) {
                    await prisma.followings.deleteMany({
                        where: {
                            follower_id: auth.id,
                            following_id: profile_data.id
                        }
                    });

                    res.send({
                        status: "unfollow"
                    });
                } else {
                    const privacy = await getPrivacyDetails(profile_data.id);
                    let accept = 1;

                    if (privacy.is_private) {
                        accept = 0;
                    }

                    await prisma.followings.create({
                        data: {
                            follower_id: auth.id,
                            following_id: profile_data.id,
                            timestamp: moment().unix().toString(),
                            accept: accept,
                        }
                    });

                    res.send({
                        status: accept === 1 ? "following" : "waiting"
                    });
                }
            }
        } else {
            console.log("hata 2");
            res.send({
                status: "error"
            });
        }
    } else {
        console.log("hata 1");
        res.send({
            status: "error"
        });
    }
}