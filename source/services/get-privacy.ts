import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getPrivacyDetails(id: number) {
    const details = await prisma.privacy_preferences.findFirst({
        where: {
            client_id: id.toString()
        }
    });

    return {
        is_private: details?.private_profile || false,
        hide_followings: details?.hide_followings || false,
        filter_nsfw: details?.filter_nsfw || true,
        hide_search_engines: details?.hide_search_engine || false,
        scan_messages: details?.scan_messages || "trust_common_friends",
    }    
}