import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ProfileResponse, FollowResponse } from "../../models/profile.model";
import moment from "moment";
import Auth from "../../services/auth";
import { findContentType } from "../../services/utils";
import { calculateUserFlags } from "../../services/flags";
import { getPremiumDetails } from "../../services/premium";
import { getPrivacyDetails } from "../../services/get-privacy";

const prisma = new PrismaClient();
const profile = express.Router();

enum BarrierTypes {
    block,
    mute
}

// TODO: Kaldırılacak
profile.get("/takipbotu", async function (req: Request, res: Response) {
    const id = 53;

    const all_users = await prisma.users.findMany();

    await prisma.followings.deleteMany({
        where: {
            following_id: id,
        }
    });

    for (const user of all_users) {
        if (user.id !== id) {
            await prisma.followings.create({
                data: {
                    follower_id: user.id,
                    following_id: id,
                    timestamp: moment().unix().toString(),
                    accept: 1,
                }
            });

            await prisma.followings.create({
                data: {
                    follower_id: user.id,
                    following_id: id,
                    timestamp: moment().unix().toString(),
                    accept: 1,
                }
            });

            await prisma.followings.create({
                data: {
                    follower_id: user.id,
                    following_id: id,
                    timestamp: moment().unix().toString(),
                    accept: 1,
                }
            });
        }
    }

    res.send("tamam herhalde");
});

profile.get("/", async function (req: Request, res: Response<ProfileResponse>) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { username } = req.query;

    if (username) {
        const profile_data = await prisma.users.findFirst({
            where: {
                username: username.toString()
            }
        });

        if (profile_data) {
            const privacy = await getPrivacyDetails(profile_data.id);

            const control_following = await prisma.followings.findFirst({
                where: {
                    follower_id: auth.id,
                    following_id: profile_data.id
                }
            });
            const following_status = control_following ? control_following.accept.toString() === "1" ? "following" : "on_request" : "no_follow";

            const followers = await prisma.followings.count({
                where: {
                    following_id: profile_data.id
                }
            });
    
            let followings = 0;
            if (!privacy.hide_followings || (privacy.hide_followings && auth.id === profile_data.id)) {
                const get_followings = await prisma.followings.count({
                    where: {
                        follower_id: profile_data.id
                    }
                });
                followings = get_followings;
            }
            
            return res.send({
                available: true,
                profile: {
                    user: {
                        id: profile_data.snowflake,
                        username: profile_data.username,
                        name: profile_data.name,
                        avatar: profile_data.avatar,
                        flags: Number(profile_data.flags),
                        about: profile_data.about,
                        jots: Number(profile_data.points),
                        accent_color: profile_data.accent_color,
                        location: profile_data.location,
                        website: profile_data.website,
                        banner: {
                            url: profile_data.banner,
                            type: findContentType(profile_data.banner),
                        },
                        details: {
                            joined_at: Number(profile_data.created_at),
                            show_joined_at: true,
                            hide_followings: privacy.hide_followings,
                            metrics: {
                                followers: followers,
                                followings: followings
                            }
                        }
                    },
                    premium: await getPremiumDetails(profile_data.id.toString(), false),
                    following: following_status,
                    is_private: privacy.is_private
                }
            });
        } else {
            return res.send({
                available: false
            });
        }
    } else {
        return res.send({
            available: false
        });
    }
});

profile.get("/followings", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { username } = req.query;

    if (username) {
        const profile_data = await prisma.users.findFirst({
            where: {
                username: username.toString()
            }
        });

        if (profile_data) {
            const response = [] as any;

            const followings = await prisma.followings.findMany({
                where: {
                    follower_id: profile_data.id
                }
            });

            for (const following of followings) {
                const user_data = await prisma.users.findFirst({
                    where: {
                        id: following.following_id
                    }
                });

                if (user_data) {
                    const flags = calculateUserFlags(user_data.flags);

                    if (!(flags.includes("DELETED") || flags.includes("SELF_DELETED"))) {
                        const is_following = await prisma.followings.findMany({
                            where: {
                                follower_id: auth.id,
                                following_id: following.following_id,
                                accept: 1
                            }
                        });

                        response.push({
                            user: {
                                id: user_data.snowflake,
                                name: user_data.name,
                                username: user_data.username,
                                avatar: user_data.avatar,
                                flags: Number(user_data.flags)
                            },
                            is_following: is_following.length !== 0
                        });
                    }
                }
            }

            res.send({
                available: true,
                list: response
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

profile.get("/followers", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { username } = req.query;

    if (username) {
        const profile_data = await prisma.users.findFirst({
            where: {
                username: username.toString()
            }
        });

        if (profile_data) {
            const response = [] as any;

            const followers = await prisma.followings.findMany({
                where: {
                    following_id: profile_data.id
                }
            });

            for (const follower of followers) {
                const user_data = await prisma.users.findFirst({
                    where: {
                        id: follower.follower_id
                    }
                });

                if (user_data) {
                    const flags = calculateUserFlags(user_data.flags);

                    if (!(flags.includes("DELETED") || flags.includes("SELF_DELETED"))) {
                        const is_following = await prisma.followings.findMany({
                            where: {
                                follower_id: auth.id,
                                following_id: follower.following_id,
                                accept: 1
                            }
                        });
                        
                        response.push({
                            user: {
                                id: user_data.snowflake,
                                name: user_data.name,
                                username: user_data.username,
                                avatar: user_data.avatar,
                                flags: Number(user_data.flags)
                            },
                            is_following: is_following.length !== 0
                        });
                    }
                }
            }

            res.send({
                available: true,
                list: response
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

profile.post("/follow", async function (req: Request, res: Response<{ status: FollowResponse }>) {
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
                    await prisma.followings.create({
                        data: {
                            follower_id: auth.id,
                            following_id: profile_data.id,
                            timestamp: moment().unix().toString(),
                            accept: 1,
                        }
                    });

                    res.send({
                        status: "following"
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
});

profile.post("/barrier/:type", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { type } = req.params;
    const { username } = req.body;

    if (username && type) {
        const profile_data = await prisma.users.findFirst({
            where: {
                username: username.toString()
            }
        });

        if (profile_data) {
            if (profile_data.id === auth.id) {
                res.send({
                    status: "error"
                });
            } else {
                const is_blocked = await prisma.blocks.findMany({
                    where: {
                        client_id: auth.id.toString(),
                        user_id: profile_data.id.toString(),
                        type: type === "block" ? "block" : "mute"
                    }
                });

                if (is_blocked.length !== 0) {
                    const remove = await prisma.blocks.deleteMany({
                        where: {
                            client_id: auth.id.toString(),
                            user_id: profile_data.id.toString(),
                            type: type === "block" ? "block" : "mute"
                        }
                    });

                    if (remove) {
                        return res.send({
                            status: "unblock"
                        });
                    } else {
                        return res.send({
                            status: "error"
                        });
                    }
                } else {
                    const add = await prisma.blocks.create({
                        data: {
                            client_id: auth.id.toString(),
                            user_id: profile_data.id.toString(),
                            type: type === "block" ? "block" : "mute",
                            timestamp: new Date()
                        }
                    });

                    if (add) {
                        return res.send({
                            status: "blocked"
                        });
                    } else {
                        return res.send({
                            status: "error"
                        });
                    }
                }
            }
        } else {
            return res.send({
                status: "error"
            });
        }
    } else {
        return res.send({
            status: "error"
        });
    }
});

export default profile;
