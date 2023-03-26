import { PrismaClient } from "@prisma/client";
import { Attachment } from "../models/post.model";
import getAvatar from "./getAvatar";

const prisma = new PrismaClient();

export default async function getAttachments(author: any, content: string): Promise<Attachment[]> {
    let attachments = [] as any;

    if (content.split("/").length <= 2) {
        // NEW
        for (const id of content.split(",")) {
            const attachment = await prisma.attachments.findFirst({
                where: {
                    id: Number(id)
                }
            });

            if (attachment) {
                let audio = undefined;

                if (attachment.audio !== "") {
                    if (attachment.audio === "original") {
                        audio = {
                            attachment_id: attachment.snowflake,
                            album_cover: `attachments/${author.id}/${attachment.type}s/${attachment.snowflake}/thumbnail.png`,
                            is_original_audio: true,
                        };
                    } else {
                        const audio_details = await prisma.attachments.findFirst({
                            where: {
                                id: Number(attachment.audio)
                            }
                        });

                        if (audio_details) {
                            const audio_author = await prisma.users.findFirst({
                                where: {
                                    id: audio_details.user
                                }
                            });

                            if (audio_author) {
                                audio = {
                                    attachment_id: audio_details.snowflake,
                                    album_cover: await getAvatar(audio_author),
                                    is_original_audio: false,
                                };
                            }
                        }
                    }
                }

                const base_url = `attachments/${author.id}/${attachment.type}s/${attachment.snowflake}`;

                attachments.push({
                    id: attachment.snowflake,
                    is_rich_media: true,

                    media_type: attachment.extension === "mp4" ? "video" : "image",

                    media_url: `${base_url}/${attachment.snowflake}.${attachment.extension}`,
                    thumbnail_url: `${base_url}/thumbnail.png`,
                    audio_url: `${base_url}/original/${attachment.snowflake}.mp3`,

                    alt_text: attachment.alt,

                    width: attachment.width,
                    height: attachment.height,
                    duration: attachment.duration,

                    audio
                });
            }
        }
    } else {
        // OLD
        for (const link of content.split(",")) {
            const extension = link.split(".")[link.split(".").length - 1];

            attachments.push({
                id: null,
                is_rich_media: false,

                media_type: extension === "mp4" ? "video" : "image",

                media_url: link,
                thumbnail_url: null,
                audio_url: null,

                alt_text: "",

                width: null,
                height: null,
                duration: null,

                audio: {
                    attachment_id: null,
                    album_cover: null,
                    is_original_audio: true,
                }
            });
        }
    }

    return attachments;
}