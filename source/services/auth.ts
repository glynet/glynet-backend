import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function Auth(req: Request, res: Response) {
    const authToken = req.headers.authorization;
    const clientControl = await prisma.users.findFirst({
        where: { token: authToken }
    });

    if (clientControl) {
        return clientControl;
    } else {
        res.status(400).json({
            message: "Yetkilendirme başarısız",
        });
        return false;
    }
}

export default Auth;
