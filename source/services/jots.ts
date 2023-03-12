import { PrismaClient } from "@prisma/client";
import { log } from "./utils";

const prisma = new PrismaClient();

export async function increaseJots(user_id: number, points: number) {
    const userData = await prisma.users.findFirst({
        where: { id: user_id }
    });

    if (userData) {
        const newPoints = Number(userData.points) + Number(points);

        await prisma.users.update({
            where: { id: userData.id },
            data: { points: newPoints }
        });

        log('\x1b[33m', `${points} adet jots, @${userData.username} kullanıcısına aktarıldı. (${userData.points} to ${newPoints})`);
        
        return {status: "increased"};
    }

    return {status: "error"};
}

export async function decreaseJots(user_id: number, points: number) {
    const userData = await prisma.users.findFirst({
        where: { id: user_id }
    });

    if (userData) {
        const newPoints = Number(userData.points) - Number(points);

        await prisma.users.update({
            where: { id: userData.id },
            data: { points: newPoints }
        });

        log('\x1b[33m', `${points} adet jots, @${userData.username} kullanıcından alındı. (${userData.points} to ${newPoints})`);
        
        return {status: "decreased"};
    }

    return {status: "error"};
}