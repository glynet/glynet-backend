import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import * as argon2 from "argon2";
import * as crypto from "crypto";
import { sendMail } from "../../services/mail";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response) {
    const { type, username, code, password, repeatPassword } = req.body;

    switch (type) {
        case "reset":
            const usernameController = await prisma.users.findFirst({
                where: { username: username }
            });

            if (usernameController) {
                const codeController = await prisma.reset_password.findFirst({
                    where: {
                        user_id: usernameController.id.toString(),
                        token: code,
                    }
                });

                if (codeController) {
                    if (password.length >= 6 && repeatPassword.length >= 6) {
                        if (password === repeatPassword) {
                            // güncelle ve yeni token yarat

                            const hashedPassword = await argon2.hash(password);
                            const token = crypto
                                .createHash("sha256")
                                .update(uuidv4())
                                .digest("hex");

                            await prisma.reset_password.deleteMany({
                                where: { user_id: usernameController.id.toString() }
                            });

                            await prisma.users.update({
                                where: {
                                    id: usernameController.id
                                },
                                data: {
                                    password: hashedPassword,
                                    token: token
                                }
                            });

                            sendMail({
                                from: "noreply",
                                to: usernameController.email,
                                subject: "Şifreniz güncellendi",
                                title: "Şifreniz güncellendi",
                                content: `Merhaba ${usernameController.name},<br>Bir kaç saniye önce şifrenizi başarıyla güncellediniz.`
                            });

                            return res.send({
                                status: "success",
                                code: "reset_password"
                            });
                        } else {
                            // şifreler aynı değil
                            return res.send({
                                status: "failed",
                                code: "passwords_doesent_match"
                            });
                        }
                    } else {
                        // şifreler 6 karakterden kısa
                        return res.send({
                            status: "failed",
                            code: "password_length_too_small"
                        });
                    }
                } else {
                    // kod yok dur
                    return res.send({
                        status: "failed",
                        code: "wrong_code"
                    });
                }
            } else {
                return res.send({
                    status: "failed",
                    code: "user_not_found"
                });
            }
            break;
        case "code":
            const usernameDetails = await prisma.users.findFirst({
                where: { username: username }
            });

            if (usernameDetails) {
                const codeControl = await prisma.reset_password.findFirst({
                    where: {
                        user_id: usernameDetails.id.toString(),
                        token: code,
                    }
                });

                if (codeControl) {
                    return res.send({
                        status: "success",
                        code: "correct_code"
                    });
                } else {
                    return res.send({
                        status: "failed",
                        code: "wrong_code"
                    });
                }
            } else {
                return res.send({
                    status: "failed",
                    code: "user_not_found"
                });
            }
            break;
        case "username":
            const usernameControl = await prisma.users.findFirst({
                where: { username: username }
            });

            if (usernameControl) {
                const token = crypto
                    .createHash("sha256")
                    .update(uuidv4())
                    .digest("hex")
                    .slice(0, 6)
                    .toUpperCase();

                await prisma.reset_password.deleteMany({
                    where: { user_id: usernameControl.id.toString() }
                });

                await prisma.reset_password.create({
                    data: {
                        user_id: usernameControl.id.toString(),
                        token: token,
                        timestamp: moment().unix().toString()
                    }
                });

                sendMail({
                    from: "noreply",
                    to: usernameControl.email,
                    subject: "Şifre sıfırlama isteği",
                    title: "Şifre sıfırlama kodunuz",
                    content: `Merhaba ${usernameControl.name},<br>Az önce bir şifre sıfırlama talebinde bulundunuz, şifre sıfırlama kodunuz: <b>${token}</b><br><br><i>Bu istek size ait değilse bu epostaya aldırış etmeyin ve şifrenizi güncelleyin.</i>`
                });

                const email = usernameControl.email;
                const emailUser = email.split("@")[0];
                const emailDomain = email.split("@")[1];

                return res.send({
                    status: "success",
                    code: "user_found",
                    addressHint: `${emailUser.slice(0,4)}${emailUser.slice(4).replace(/./g, "*")}@${emailDomain}`
                });
            } else {
                return res.send({
                    status: "failed",
                    code: "user_not_found"
                });
            }
            break;
    }
}