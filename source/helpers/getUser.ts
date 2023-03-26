import { PrismaClient } from "@prisma/client";
import getAvatar from "./getAvatar";

const prisma = new PrismaClient();

type IdTypes = "id" | "snowflake";

export type UserType = {
    is_user_ready: boolean,
    data: {
        id: string,
        name: string,
        username: string,
        avatar: string,
        flags: number
    }
}

export default async function getUser(user_id: string|number, id_type: IdTypes = "id"): Promise<UserType> {
    let where_query: any = {
        id: user_id
    };

    if (id_type === "snowflake") {
        where_query = {
            snowflake: user_id
        };
    }

    const get_user = await prisma.users.findMany({
        take: 1,
        where: where_query,
        select: {
            id: true,
            snowflake: true,
            name: true,
            username: true,
            avatar: true,
            flags: true,
            points: true
        }
    });

    if (get_user.length !== 0) {
        const user_data = get_user[0];

        return {
            is_user_ready: true,
            data: {
                id: user_data.snowflake,
                name: user_data.name,
                username: user_data.username,
                avatar: await getAvatar(user_data),
                flags: user_data.flags
            }
        }
    }

    return {
        is_user_ready: false,
        data: {
            id: "0",
            name: "Mr. Net",
            username: "mrnet",
            avatar: "img/avatar.png",
            flags: 0
        }
    }
}