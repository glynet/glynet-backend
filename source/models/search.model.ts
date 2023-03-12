export type SearchType = "profile" | "location" | "hashtag";

export type SearchItem = {
    type: SearchType;
    title: string;
    subtitle?: string;
    image?: string;
}
