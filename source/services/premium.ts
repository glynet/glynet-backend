import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getPremiumDetails(id: string, forApi: boolean = false) {
    const details = await prisma.premium.findFirst({
        where: {
            client_id: id
        }
    })

    if (!details) {
        return { is_active: false };
    } else {
        if (forApi) {
            return {
                is_active: details.is_active === "1",
                premium_type: Number(details.premium_type),
                premium_since: Number(details.premium_since),
                premium_end: Number(details.premium_end),
                gift: {
                    is_gift: details.gift_from === "1"
                }
            };
        } else {
            return {
                is_active: details.is_active === "1",
                premium_type: Number(details.premium_type),
                premium_since: Number(details.premium_since),
            };
        }
    }
}