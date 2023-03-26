import { UserType } from "../helpers/getUser";

export type Comment = {
    id: string;
    user: UserType;
    comment: {
        content: string;
        attachments: string[];
        likes: {
            count: number;
            is_liked: boolean;
        }
    }
    position: number;
    post_id: string;
    replied_to: string;
    replies?: Reply[];
    reply_count: number;
    flags: number;
    timestamp: number;
}

export type Reply = {
    id: string;
    user: UserType;
    comment: {
        content: string;
    };
    timestamp: number;
}