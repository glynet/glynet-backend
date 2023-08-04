enum UserFlags {
    GLYNET_EMPLOYEE, // 1
    VERIFIED_USER, // 2
    ARTIST_USER, // 4
    SPAMMER, // 8
    SYSTEM,  // 16
    HAS_UNREAD_URGENT_MESSAGES, //32
    VERIFIED_MAIL, // 64
    USED_WEB_CLIENT, // 128
    USED_MOBILE_CLIENT, // 256
    UNDERAGE_DELETED, // 512
    SELF_DELETED, // 1024
    DELETED, // 2048
    DISABLED_SUSPICIOUS_ACTIVITY, // 4096
    SELF_DISABLED, // 8192
    DISABLED, // 16384
    NSFW_PROFILE, // 32768
    MEMORIALIZED_PROFILE // 65536
}

enum NotificationFlags {
    LOGIN_ALERT, // 1
    MENTION_ALERT, // 2
    COMMENTS_MENTION_ALERT, // 4
    ANNOUNCEMENTS, // 8
    TIPS // 16
}

enum CommentsFlags {
    SELF_DELETED,
    SYSTEM_DELETED,
    POST_DELETED,
    CONTAINS_GIF
}

function calculateFlags(type: any, flag: number) {
    const flagNum = BigInt(flag);
    const results = [];

    for (let i = 0; i <= 64; i++) {
        const bitwise = 1n << BigInt(i);

        if (flagNum & bitwise) {
            const flag = Object.entries(type).find((f) => f[1] === i)?.[0] || `UNKNOWN_FLAG_${i}`;
            results.push(flag);
        }
    }

    return results || "NONE";
}

export function calculateCommentFlags(flag: number) {
    return calculateFlags(CommentsFlags, flag);
}
export function calculateUserFlags(flag: number) {
    return calculateFlags(UserFlags, flag);
}

export function calculateNotificationFlags(flag: number) {
    return calculateFlags(NotificationFlags, flag);
}
