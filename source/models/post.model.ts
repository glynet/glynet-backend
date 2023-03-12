export type User = {
    id: string;
    name: string;
    username: string;
    avatar: string;
    flags: number;
}

export type Post = {
    id: string;
    archived: boolean;
    circle?: any; // buna bak
    author: User;
    content: {
        text: string;
        attachments: string[];
        location: string;
        timestamp: number;
        details: {
            likes: {
                is_liked: boolean;
                count: number;
            };
            is_bookmarked: boolean;
            comments: number;
        }
    }
}

export type UserList = {
    user: User;
    following: boolean;
    timestamp: number;
}
