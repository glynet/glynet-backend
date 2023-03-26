import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function getBanner(user: any) {
    if (isNaN(Number(user.banner))) {
        return user.banner;
    } else {
        const attachment = await prisma.attachments.findFirst({
            where: {
                id: Number(user.banner)
            }
        });

        if (attachment) {
            return `attachments/${user.snowflake}/${attachment.type}s/${attachment.snowflake}/${attachment.snowflake}.${attachment.extension}`;
        } else {    
            return "";
        }
    }
}