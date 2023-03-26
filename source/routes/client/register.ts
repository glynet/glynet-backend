import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import * as argon2 from "argon2";
import * as crypto from "crypto";
import { generateSnowflakeID } from "../../services/generator";
import { sendMail } from "../../services/mail";
import { totpSecret } from "../../services/totp";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response) {
    const { username, email, password, password_confirm } = req.body;

    if (password === password_confirm) {
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

        if (usernameRegex.test(username)) {
            if (emailRegex.test(email)) {
                const usernameControl = await prisma.users.findFirst({
                    where: {
                        username: username
                    }
                });

                if (!usernameControl) {
                    const emailControl = await prisma.users.findFirst({
                        where: {
                            email: email
                        }
                    });

                    if (!emailControl) {
                        const hashedPassword = await argon2.hash(password);
                        const color = "#30d3e1";
                        const snowflake = generateSnowflakeID();
                        const verifyCode = crypto.randomInt(1000000, 9999999);

                        // const ipData = await getIPDetails(require("ipware")().get_ip(req));

                        const uuid = uuidv4();
                        const token = crypto
                            .createHash("sha256")
                            .update(uuid)
                            .digest("hex");

                        const createUser = await prisma.users.create({
                            data: {
                                totp_secret: totpSecret(),
                                snowflake: snowflake,
                                token: token,
                                username: username,
                                name: username,
                                email: email,
                                password: hashedPassword,
                                avatar: "img/avatar.png",
                                banner: "",
                                flags: 0,
                                points: 250,
                                language: "tr",
                                accent_color: color,
                                verify_code: verifyCode.toString(),
                                about: "Merhaba dünya!",
                                theme: "light",
                                location: "",
                                website: "",
                                created_at: moment().unix().toString(),
                                updated_at: new Date(),
                                two_fa_enabled: false,
                                notification_flags: 31,
                            }
                        });

                        console.log(createUser);

                        if (createUser) {
                            sendMail({
                                from: "noreply",
                                to: email,
                                subject: "E-Posta Doğrulama",
                                title: "Doğrulama kodunuz",
                                content: `Merhaba, Glynet doğrulama kodunuz: <b>${verifyCode}</b><br>Keyifli günler dileriz.`
                            });


                            res.send({
                                status: true,
                                code: 7,
                                message: "Hesap oluşturuldu",
                                token: token,
                            });
                        } else {
                            res.send({
                                status: false,
                                code: 6,
                                message: "Hesap oluşturulamadı"
                            });
                        }
                    } else {
                        res.send({
                            status: false,
                            code: 5,
                            message: "E-posta adresi kullanılıyor"
                        });
                    }
                } else {
                    res.send({
                        status: false,
                        code: 4,
                        message: "Kullanıcı adı kullanılıyor"
                    });
                }
            } else {
                res.send({
                    status: false,
                    code: 3,
                    message: "Geçersiz e-posta adresi"
                });
            }
        } else {
            res.send({
                status: false,
                code: 2,
                message: "Geçersiz kullanıcı adı"
            });
        }
    } else {
        res.send({
            status: false,
            code: 1,
            message: "Şifreler eşleşmiyor"
        });
    }
}