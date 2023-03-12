import { User } from "./post.model";

export type Comment = {
    id: string;
    user: User;
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
    flags: number;
    timestamp: number;
}
