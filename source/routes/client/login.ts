import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import moment from "moment";
import { getIPDetails } from "../../services/ip-api";
import { v4 as uuidv4 } from "uuid";
import * as argon2 from "argon2";
import * as crypto from "crypto";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response) {
    const { email, password } = req.body;

    try {
        const account_control = await prisma.users.findFirst({
            where: {
                OR: [
                    { email: email },
                    { username: email }
                ]
            }
        });

        if (account_control !== null && account_control.password !== null) {
            if (await argon2.verify(account_control.password, password)) {
                const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "::1";
                const ipData = await getIPDetails(ip);
                const browser = req.useragent?.browser ? req.useragent?.browser : "None";
                const os = req.useragent?.os ? req.useragent?.os : "None";

                await prisma.login_activity.create({
                    data: {
                        client_id: account_control.id.toString(),
                        ip_address: ipData.address,
                        browser: browser,
                        os: os,
                        location: ipData.location.full,
                        timezone: ipData.timezone,
                        date: moment().unix().toString()
                    }
                });

                res.send({
                    status: true,
                    code: 3, // ŞİFRE DOĞRU,
                    token: account_control.token
                });
            } else {
                res.send({
                    status: false,
                    code: 2, // ŞİFRE YANLIŞ
                });
            }
        } else {
            res.send({
                status: false,
                code: 1, // HESAP YOK
            });
        }
    } catch(e: any) {
        res.send({
            status: false,
            code: 4, // SİSTEM CORTLADI
        });
    }
}