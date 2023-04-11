import { UserType } from "../helpers/getUser";

export type Post = {
    id: string;
    publisher: UserType;

    is_loop: boolean;
    
    full_text: string;
    text_range: number[];

    published_at_str: string,
    published_at_unix: number;
    edited_at_str: string;
    edited_at_unix: number;

    coordinates: string|null;
    place: string|null;

    is_entry_archived: boolean;
    sensitive_content: boolean;

    media_attachments: Attachment[];

    metrics: {
        like_count: number;
        reply_count: number;
        save_count: number;
        qoute_count: number;
    };

    is_liked: boolean;
    is_saved: boolean; 

    tags: string[]|null;
    poll: null;

    is_muted: boolean;
    language: string;
    visibility: string;
}

export type UserFollowingType = "following" | "on_request" | "no_follow";

export type UserList = {
    user: UserType;
    following: UserFollowingType;
}

export type MediaTypes = "video" | "image";

export type Attachment = {
    id: string|null;
    is_rich_media: boolean;
    media_type: MediaTypes;

    media_url: string;
    thumbnail_url: string|null;
    audio_url: string|null;

    alt_text: string;

    width: number|null;
    height: number|null;
    duration: number|null;

    audio: {
        attachment_id: string|null;
        album_cover: string|null;
        is_original_audio: boolean;
    }
}

export type Audio = {
    entry_id: string;
    attachment_id: string;
    publisher: UserType;
    attachments: Attachment[];
}