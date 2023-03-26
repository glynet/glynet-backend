import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function getAvatar(user: any): Promise<string> {
    if (isNaN(Number(user.avatar))) {
        return user.avatar;
    } else {
        const attachment = await prisma.attachments.findFirst({
            where: {
                id: Number(user.avatar)
            }
        });

        if (attachment) {
            return `attachments/${user.snowflake}/${attachment.type}s/${attachment.snowflake}/${attachment.snowflake}.${attachment.extension}`;
        } else {    
            return "img/avatar.png";
        }
    }
}
