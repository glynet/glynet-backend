import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";
import * as crypto from "crypto";
import { calculateUserFlags } from "../../services/flags";
import { generateSnowflakeID } from "../../services/generator"
import { importFiles } from "../../services/import-files"

import { sendMail } from "../../services/mail";
import * as argon2 from "argon2";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 32000000,
    },
    fileFilter: (req: Request, file: any, cb: any) => {
        if (
            !file.originalname.match(
                /\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|mp4|MP4)$/
            )
        )
            return cb(null, false);

        cb(null, true);
    },
})
const prisma = new PrismaClient();
const settings = express.Router();

settings.get("/username_available", async function (req: Request, res: Response) {
    const { username } = req.query;

    if (username) {
        const control = await prisma.users.findFirst({
            where: { username: username.toString() }
        });
        
        if (control === null) {
            return res.send({
                available: true,
            });
        }
    }

    return res.send({
        available: false,
    });
});

settings.get("/email_available", async function (req: Request, res: Response) {
    const { email } = req.query;

    if (email) {
        const control = await prisma.users.findFirst({
            where: { email: email.toString() }
        });
        
        if (control === null) {
            return res.send({
                available: true,
            });
        }
    }

    return res.send({
        available: false,
    });
});

settings.put("/upload_avatar", upload.array("file"), async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const is_premium = false;
    let avatar_url: string = auth.avatar;

    if ((req.files as any).length < 1) 
        return res.send({
            status: "bad_request",
        });
        
    if (!(req.files as any)[0].originalname.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/)) {
        return res.send({
            status: "bad_request",
        });
    } else {
        if (!is_premium && (req.files as any)[0].originalname.toLowerCase().match(/\.(gif)$/)) {
            return res.send({
                status: "premium_error",
            });
        }
    }

    const importer = await importFiles([(req.files as any)[0]], `./attachments/${auth.snowflake}/avatars/${generateSnowflakeID()}/`);
    avatar_url = (importer.filePaths as string);

    const update = await prisma.users.update({
        where: { id: auth.id },
        data: { avatar: avatar_url }
    });

    if (update) {
        return res.send({
            status: "updated",
            url: avatar_url
        });
    }

    return res.send({
        status: "error"
    });
});

settings.put("/upload_banner", upload.array("file"), async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const is_premium = true;
    let banner_url: string = auth.banner;
    if ((req.files as any).length < 1) 
        return res.send({
            status: "bad_request"
        });

    if (!(req.files as any)[0].originalname.toLowerCase().match(/\.(jpg|jpeg|png|gif|mp4)$/)) {
        return res.send({
            status: "bad_request"
        });
    } else {
        if (!is_premium && (req.files as any)[0].originalname.toLowerCase().match(/\.(gif|mp4)$/)) {
            return res.send({
                status: "premium_error",
            });
        } 
    }

    const importer = await importFiles([(req.files as any)[0]], `./attachments/${auth.snowflake}/banners/${generateSnowflakeID()}/`);
    banner_url = (importer.filePaths as string);
    
    const update = await prisma.users.update({
        where: { id: auth.id },
        data: { banner: banner_url }
    });

    if (update) {
        return res.send({
            status: true,
            url: banner_url
        });
    }

    return res.send({
        status: "error"
    });
});

settings.post("/edit_profile", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    const { name, username, about, website } = req.body;

    let new_name: string = auth.name;
    let new_username: string = auth.username;
    let new_about: string = auth.about;
    let new_website: string = auth.website;

    if (name && name.length <= 32) {
        new_name = name;
    }

    if (username && (username.length >= 2 && username.length <= 16) && usernameRegex.test(username)) {
        const control = await prisma.users.findFirst({
            where: { username: username.toString() }
        });

        if (control === null) {
            new_username = username;
        }
    }

    if (about && (about.length !== 0 && about.length <= 128)) {
        new_about = about;
    }

    if (website && (website.length >= 3 && website.length <= 32)) {
        const urlPattern = /(?:https?):\/\/(\w+:?\w*)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/;

        if (urlPattern.test(website)) {
            new_website = website;
        }
    }

    const update = await prisma.users.update({
        where: { id: auth.id },
        data: {
            name: new_name,
            username: new_username,
            about: new_about,
            website: new_website
        }
    });

    if (update) {
        return res.send({
            status: true
        }); 
    }

    return res.send({
        status: false
    });
});

settings.post("/update_email", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { email } = req.body;
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    const verifyCode = (crypto.randomInt(1000000, 9999999)).toString();
    
    if (email) {
        if (emailRegex.test(email)) {

            const mailControl = await prisma.users.findFirst({
                where: {
                    email: email
                }
            });

            if (!mailControl) {
                const update = await prisma.users.update({
                    where: { id: auth.id },
                    data: {
                        email: email,
                        verify_code: verifyCode,
                        flags: 
                            calculateUserFlags(auth.flags).includes("VERIFIED_MAIL") ? 
                                auth.flags - 64 : auth.flags         
                    }
                });
            
                if (update) {
                    sendMail({
                        from: "noreply",
                        to: email,
                        subject: "E-Posta Doğrulama",
                        title: "Doğrulama kodunuz",
                        content: `Merhaba, Glynet e-posta adresiniz başarıyla güncellenmiştir. Doğrulama kodunuz: <b>${verifyCode}</b><br>Keyifli günler dileriz.`
                    });

                    return res.send({
                        status: "updated"
                    }); 
                }
            } else {
                return res.send({
                    status: "mail_in_usage"
                });
            }
        } else {
            return res.send({
                status: "not_match_type_mail_account"
            });
        }
    } else {
        return res.send({
            status: "email_field_empty"
        });
    }

    return res.send({
        status: "error"
    });
});

settings.post("/verify_email", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { code } = req.body;

    if (code) {       

        if (code === auth.verify_code) {

            if (!(calculateUserFlags(auth.flags).includes("VERIFIED_MAIL"))) {
                const update = await prisma.users.update({
                    where: { id: auth.id },
                    data: {
                        flags: auth.flags + 64
                    }
                });
            
                if (update) {
                    sendMail({
                        from: "noreply",
                        to: auth.email,
                        subject: "E-posta adresiniz güncellendi",
                        title: "E-posta adresiniz güncellendi",
                        content: `Merhaba, Glynet hesabınız <a href="https://glynet.com/@${auth.username}" target="_blank">(@${auth.username})</a> artık bu e-posta hesabı ile ilişkilendirilmiştir. <br>Keyifli günler dileriz.`
                    });

                    return res.send({
                        status: "updated"
                    });
                }
            } else {
                return res.send({
                    status: "verified_before"
                }); 
            }
        } else {
            return res.send({
                status: "wrong_code"
            });
        }
    }
    
    return res.send({
        status: "error"
    });
});

settings.post("/update_password", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { old_password, new_password, new_password_again } = req.body;

    if (old_password && new_password && new_password_again) {
        if (await argon2.verify(auth.password, old_password)) {
            if (new_password === new_password_again) {
                if (!await argon2.verify(auth.password, new_password)) {
                    const new_hashed_password = await argon2.hash(new_password);
                    
                    const token = crypto
                            .createHash("sha256")
                            .update(uuidv4())
                            .digest("hex");

                    const update = await prisma.users.update({
                        where: { id: auth.id },
                        data: { 
                            password: new_hashed_password,
                            token: token
                        }
                    });

                    if (update) {
                        sendMail({
                            from: "noreply",
                            to: auth.email,
                            subject: "Şifreniz güncellendi",
                            title: "Şifreniz güncellendi",
                            content: `Merhaba ${auth.name}, Glynet şifreniz başarıyla güncellendi!<br>Bu işlem size ait değilse vakit kaybetmeden şifrenizi güncelleyin.`
                        });

                        return res.send({
                            status: true,
                            token: token
                        });
                    }
                }
            }
        }
    }
    
    return res.send({
        status: false
    });
});

settings.post("/privacy_update", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { hide_followings, private_profile, filter_nsfw, hide_search_engine, scan_messages } = req.body;

    if ( 
        typeof hide_followings === "boolean" &&
        typeof private_profile === "boolean" && 
        typeof filter_nsfw === "boolean" && 
        typeof hide_search_engine === "boolean" &&
        (typeof scan_messages === "number" && scan_messages >= 0 && scan_messages <= 2)
    ) {
        const control = await prisma.privacy_preferences.findFirst({
            where: { client_id: auth.id.toString() }
        });

        if (control) {
            // var update
            const update = await prisma.privacy_preferences.updateMany({
                where: {
                    client_id: auth.id.toString(),
                },
                data: {
                    hide_followings: hide_followings,
                    private_profile: private_profile,
                    filter_nsfw: filter_nsfw,
                    hide_search_engine: hide_search_engine,
                    scan_messages: 
                        scan_messages === 0 ? 
                        "trust_everyone" : 
                            scan_messages === 1 ? 
                                "trust_common_friends" : 
                                "never_trust",
                    updated_at: new Date()
                }
            }); 

            if (update) {
                return res.send({
                    status: "updated"
                });
            }
        } else {
            const create = await prisma.privacy_preferences.create({
                data: {
                    client_id: auth.id.toString(),
                    hide_followings: hide_followings,
                    private_profile: private_profile,
                    filter_nsfw: filter_nsfw,
                    hide_search_engine: hide_search_engine,
                    scan_messages: 
                        scan_messages === 0 ? 
                            "trust_everyone" : 
                            scan_messages === 1 ? 
                                "trust_common_friends" : 
                                "never_trust",
                    updated_at: new Date()
                }
            }); 

            if (create) {
                return res.send({
                    status: "created"
                });
            }
        }

    }

    return res.send({
        status: "error"
    });
});

settings.post("/update_notifications", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { login_alerts, mention_alerts, comments_mention_alert, announcements, tips } = req.body;

    if (
        typeof login_alerts === "boolean" &&
        typeof mention_alerts === "boolean" &&
        typeof comments_mention_alert === "boolean" &&
        typeof announcements === "boolean" &&
        typeof tips === "boolean"
    ) {
        let calculate_flags = 0;

        if (login_alerts)
            calculate_flags += 1;
        if (mention_alerts)
            calculate_flags += 2;
        if (comments_mention_alert) 
            calculate_flags += 4;
        if (announcements) 
            calculate_flags += 8;
        if (tips) 
            calculate_flags += 16;

        const update = await prisma.users.update({
            where: {
                id: auth.id
            },
            data: {
                notification_flags: calculate_flags
            }
        });

        if (update) {
            return res.send({
                status: true
            });
        }
    }

    return res.send({
        status: false
    });
});

settings.delete("/delete", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { type, password, password_confirm, code } = req.body;

    switch (type) {
        case "delete":
            if (code) {
                const code_control = await prisma.delete_account.findFirst({
                    where: { 
                        client_id: auth.id.toString(), 
                        token: code 
                    }
                });

                if (code_control) {
                    if (moment().unix() < moment(code_control.timestamp).unix()) {
                        const random_code = (crypto.randomInt(1000000000, 9999999999)).toString();
                        
                        const token = crypto
                            .createHash("sha256")
                            .update(uuidv4())
                            .digest("hex");
                            
                        const update = await prisma.users.update({
                            where: {
                                id: auth.id
                            },
                            data: {
                                flags: auth.flags + 1024,
                                username: `deleted_user_${random_code}`,
                                email: `deleted_user_${random_code}@ghost.glynet.com.tr`,
                                token: token
                            }
                        });

                        if (update) {
                            const delete_followings = await prisma.followings.deleteMany({
                                where: {
                                    OR: [
                                        { follower_id: auth.id },
                                        { following_id: auth.id }
                                    ]
                                }
                            });

                            const delete_likes = await prisma.likes.deleteMany({
                                where: {
                                    user_id: auth.id
                                }
                            });

                            const delete_notifications = await prisma.notifications.deleteMany({
                                where: {
                                    user_id: auth.id.toString()
                                }
                            });

                            const delete_comment_likes = await prisma.comment_likes.deleteMany({
                                where: {
                                    user_id: auth.id.toString()
                                }
                            });
                            
                            const delete_comments = await prisma.comments.updateMany({
                                where: {
                                    author_id: auth.id.toString()
                                },
                                data: {
                                    flags: 2
                                }
                            });

                            const delete_codes = await prisma.delete_account.deleteMany({
                                where: {
                                    client_id: auth.id.toString()
                                }
                            });
                            
                            return res.send({
                                status: "success"
                            });
                        }
                    } else {
                        await prisma.delete_account.delete({
                            where: {
                                id: code_control.id
                            }
                        });

                        return res.send({
                            status: "code_timeout"
                        });
                    }
                } else {
                    return res.send({
                        status: "code_not_match"
                    });
                }
            }
            break;
    
        case "verify":
        default:
            if (password && password_confirm) {
                if (password === password_confirm) {
                    if (await argon2.verify(auth.password, password)) {
                        const verify_code = (crypto.randomInt(1000000, 9999999)).toString();
                        // send code

                        const create_code = await prisma.delete_account.create({
                            data: {
                                client_id: auth.id.toString(),
                                token: verify_code,
                                timestamp: moment().add(2, "minutes").toDate()
                            }
                        });

                        if (create_code) {
                            sendMail({
                                from: "noreply",
                                to: auth.email,
                                subject: "Hesabını kalıcı sil",
                                title: "Glynet hesabını kalıcı sil",
                                content: `Merhaba, ${auth.name} (@${auth.username}) Glynet hesabını kalıcı olarak silmek istediğini öğrendik. İstersen hesabını dondurabilir veya kalıcı olarak silebilrsin. İşte hesabını kalıcı olarak silmen için gerekli sihirli sayılar: <b>${verify_code}</b><br>Keyifli günler dileriz.`
                            });
                            
                            return res.send({
                                status: "mail_sent"
                            });
                        }
                    } else {
                        return res.send({
                            status: "wrong_password"
                        });
                    }
                } else {
                    return res.send({
                        status: "password_not_match"
                    });
                }
            } else {
                return res.send({
                    status: "password_field_empty"
                });
            }
            break;
    }

    return res.send({
        status: "error"
    });
});

/* settings.post("/freeze_account", async function (req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { password, password_confirm } = req.body;
    // SELF_DISABLED 8192

    if (password && password_confirm) {
        if (password === password_confirm) {
            if (await argon2.verify(auth.password, password)) {
                if(!(calculateUserFlags(auth.flags).includes("SELF_DISABLED"))) {
                    const token = crypto
                    .createHash("sha256")
                    .update(uuidv4())
                    .digest("hex");

                    const update = await prisma.users.update({
                        where: {
                            id: auth.id
                        },
                        data: {
                            token: token,
                            flags: auth.flags + 8192
                        }
                    });

                    if (update) {
                        sendMail({
                            from: "noreply",
                            to: auth.email,
                            subject: "Hesabını geçiçi olarak dondur",
                            title: "Glynet hesabınız donduruldu",
                            content: `Merhaba, ${auth.name} (@${auth.username}) Glynet hesabınız donduruldu. Dilediğiniz vakitte hesabınıza tekrar giriş yapabilirsiniz. <br>Keyifli günler dileriz.`
                        }); 
                        return res.send({
                            status: "success"
                        })
                    }
                } return res.send({
                    status: "has_frozen_before"
                })
                
            } else {
                return res.send({
                    status: "wrong_password"
                })
            }
        } else {
            return res.send({
                status: "password_not_match"
            })
        }
    } else {
        return res.send({
            status: "password_field_empty"
        })
    }
    

    return res.send({
        status: false
    });
}); */

export default settings;