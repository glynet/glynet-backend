import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import Auth from "../../services/auth";
import { generateSnowflakeID } from "../../services/generator";
import { importFile } from "../../services/import-files";
import moment from "moment";

const prisma = new PrismaClient();

export default async function handler(req: Request, res: Response) {
    const auth = await Auth(req, res);
    if (!auth) return;

    const { content, location } = req.body;
    const files = req.files as Express.Multer.File[];
    const snowflake = generateSnowflakeID();

    let save_post = true;
    let error_code = 0;
    let safe_post_text = "";
    let safe_location = "";

    let type = (!req.query?.w ? "posts" : req.query.w) as any;
    let attachments: any = "";
    
    if (content !== undefined || files.length !== 0) {
        if (content !== undefined) {
            // Premium = 1024
            safe_post_text = content.slice(0, 256);
        }

        if (location !== undefined) {
            safe_location = location.slice(0, 64);
        }

        if (files.length !== 0) {
            for (let i = 0; i < files.length; i++) {
                const attachment = files[i];
                const attachment_id = generateSnowflakeID() + i;

                const uploadAttachment = await importFile({
                    id: attachment_id,
                    authorId: auth.snowflake,
                    file: attachment,
                    isMuted: false,
                    isCollapsed: false,
                    type: type,
                    keepOriginal: true,
                    maxPayloadLimit: 32
                });;
                
                if (uploadAttachment.status) {
                    const addAttachmentToDatabase = await prisma.attachments.create({
                        data: {
                            snowflake: attachment_id,
                            user: auth.id,
                            alt: "",
                            extension: uploadAttachment.fileType,
                            audio: "original",
                            external_id: 0,
                            type: type.slice(0, -1),
                            width: uploadAttachment.width,
                            height: uploadAttachment.height,
                            duration: uploadAttachment.duration,
                            flags: 0,
                            timestamp: new Date()
                        }
                    });

                    if (addAttachmentToDatabase) {
                        console.log(addAttachmentToDatabase.id.toString());
                        attachments = addAttachmentToDatabase.id.toString();
                    } else {
                        return res.send({
                            is_entry_created: false,
                            error_code: 128,
                        });
                    }                
                } else {
                    save_post = false;
                    error_code = uploadAttachment.code;
                }
            }
        }
        
        if (save_post) {
            const create = await prisma.posts.create({
                data: {
                    snowflake: snowflake,
                    author_id: auth.id,
                    content: safe_post_text,
                    is_loop: type === "loops",
                    attachments: attachments,
                    created_at: moment().unix().toString(),
                    updated_at: new Date(),
                    location: safe_location,
                    archived: false
                }
            });
        
            if (create) {
                if (attachments.length !== 0) {
                    await prisma.attachments.update({
                        where: {
                            id: Number(attachments)
                        },
                        data: {
                            external_id: create.id
                        }
                    });
                }

                return res.send({
                    is_entry_created: true,
                    error_code: error_code,
                    created_at: new Date(),
                    entry_id: "entry-" + snowflake,
                });
            }
        }
    }

    return res.send({
        is_entry_created: false,
        error_code: error_code
    });
}