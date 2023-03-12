import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import * as argon2 from "argon2";
import * as crypto from "crypto";
import { generateSnowflakeID } from "../../services/generator";
import { sendMail } from "../../services/mail";
import { totpSecret } from "../../services/totp";
import { getIPDetails } from "../../services/ip-api";
import Auth from "../../services/auth";

const prisma = new PrismaClient();
const client = express.Router();

client.post("/login", async function (req: Request, res: Response) {
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
});

client.post("/register", async function (req: Request, res: Response) {
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
});

client.post("/reset_password", async function (req: Request, res: Response) {
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
});

client.get("/follow_requests", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const response: any[] = [];

    const follow_requests = await prisma.followings.findMany({
        where: {
            following_id: auth.id,
            accept: 0
        }
    });

    for (const request of follow_requests) {
        const user = await prisma.users.findFirst({
            where: {
                id: request.follower_id
            }
        });

        if (user) {
            response.push({
                user: {
                    id: user.snowflake,
                    name: user.name,
                    username: user.username,
                    avatar: user.avatar,
                    flags: user.flags
                }
            });
        }
    }

    res.send({
        list: response
    });
});

client.get("/blocks", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const response: any[] = [];

    const blocks = await prisma.blocks.findMany({
        where: {
            client_id: auth.id.toString()
        }
    });

    for (const block of blocks) {
        const user = await prisma.users.findFirst({
            where: { id: Number(block.user_id) }
        });

        if (user) {
            response.push({
                user: {
                    id: user.snowflake,
                    name: user.name,
                    username: user.username,
                    avatar: user.avatar,
                    flags: user.flags
                },
                type: block.type,
                timestamp: block.timestamp
            });
        }
    }

    return res.send({
        list: response
    });
});

client.post("/follow_requests/:update", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { update } = req.params;
    const { user_id } = req.body;

    if (user_id) {
        const get_user = await prisma.users.findFirst({
            where: { snowflake: user_id }
        });

        if (get_user) {
            switch (update) {
                case "accept":
                    const update = await prisma.followings.updateMany({
                        where: {
                            follower_id: get_user.id,
                            following_id: auth.id
                        },
                        data: {
                            accept: 1
                        }
                    });

                    if (update.count === 1) {
                        return res.send({
                            status: true
                        });
                    }
                    break;
            
                case "decline":
                default:
                    const remove = await prisma.followings.deleteMany({
                        where: {
                            follower_id: get_user.id,
                            following_id: auth.id
                        }
                    });

                    if (remove.count === 1) {
                        return res.send({
                            status: true
                        });
                    }
                    break;
            }
        }
    }
        
    return res.send({
        status: false,
    });
});

export default client;
