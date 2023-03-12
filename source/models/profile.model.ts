export type ContentType = "image" | "video" | "text";
export type FollowingStatus = "following" | "on_request" | "no_follow";

export type PremiumDetails = {
    is_active: boolean;
    premium_type?: number;
    premium_since?: number;
};

export type Profile = {
    user: {
        id: string;
        username: string;
        name: string;
        avatar: string;
        flags: number;
        about: string;
        jots: number;
        accent_color: string;
        location: string;
        website: string;
        banner: {
            url: string;
            type: ContentType;
        },
        details: {
            joined_at: number;
            show_joined_at: boolean;
            hide_followings: boolean;
            metrics: {
                followers: number;
                followings: number;
            }
        }
    };
    premium: PremiumDetails;
    following: FollowingStatus;
    is_private: boolean;
};

export type FollowResponse = "following" | "waiting" | "unfollow" | "error";
export type ProfileResponse = {
    available: boolean;
    profile?: Profile;
}