import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ProfileResponse } from "../../models/profile.model";
import Auth from "../../services/auth";
import { findContentType } from "../../services/utils";
import { getPremiumDetails } from "../../services/premium";
import { getPrivacyDetails } from "../../services/get-privacy";
import { getAverageColor } from 'fast-average-color-node';
const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response<ProfileResponse>) {
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
            console.log(control_following, profile_data.id)
            const following_status = control_following ? control_following.accept.toString() === "1" ? "following" : "on_request" : "no_follow";

            const control_barrier = await prisma.blocks.findMany({
                where: {
                    client_id: String(auth.id),
                    user_id: String(profile_data.id)
                }
            })
            let is_muted = false
            let is_blocked = false

            for (const barrier of control_barrier) {
                if (barrier.type === "block") {
                    is_blocked = true
                } else if (barrier.type === "mute") {
                    is_muted = true
                }
            }

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

            let colors: any;
            await getAverageColor(profile_data.avatar.replace("cdn", "attachments")).then((color: any) => {
                colors = color
            });

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
                        color_palette: {
                            average_color_rgb: colors.rgb,
                            average_color_hex: colors.hex,
                            is_dark: colors.isDark
                        },
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
                    is_private: privacy.is_private,
                    is_muted,
                    is_blocked
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
}
