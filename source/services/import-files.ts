import {generateSnowflakeID} from "./generator";
import CompressService from "./compress";
import sharp from "sharp";
import util from "util";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";

export type ImportTypes = "posts" | "loops" | "vibes" | "avatars" | "banners";
export type PayloadLimits = 16 | 32 | 64 | 128;
export type AcceptTypes = "mp4" | "jpeg" | "png" | "gif" | "jpg";
export type Importer = {
    id: string; // Snowflake
    authorId: string; // Author Snowflake ID
    file: any; // File
    isMuted?: boolean; // Videodaki sesi kaldır
    isCollapsed?: boolean; // Boşlukları doldur
    type?: ImportTypes; // Dosyalama için
    keepOriginal?: boolean; // Orijinal dosyayı sakla?
    maxPayloadLimit?: PayloadLimits;
}
export type ImporterResponse = {
    id: string;
    height: number;
    width: number;
    duration: number,
    fileType: any,
    thumbnail: string;
    status: boolean;
    code: number;
}

export async function importFile({
    id,
    authorId,
    file,
    isMuted = false,
    isCollapsed = false,
    type = "posts",
    keepOriginal = true,
    maxPayloadLimit = 32
}: Importer): Promise<ImporterResponse> {
    const compress = new CompressService();

    compress.setKeepOriginal(keepOriginal);
    compress.setPath(`./attachments/${authorId}/${type}/${id}/`);

    const fileType = file.originalname.split(".")[file.originalname.split(".").length - 1].toLowerCase();            
    const fileName: string = `${id}.${fileType}`;
    const filePath = compress.getPath(fileName, true, null);
    
    let thumbnail: string = "";
    let width: number = 1280;
    let height: number = 720;
    let duration = 0;
    
    if (file === null || file.size >= maxPayloadLimit * 1024 * 1024)
        return {
            id,
            height: height,
            width: width,
            duration: duration,
            fileType: fileType,
            thumbnail: thumbnail,
            status: false,
            code: 16
        };

    if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|mp4|MP4)$/))
        return {
            id,
            height: height,
            width: width,
            duration: duration,
            fileType: fileType,
            thumbnail: thumbnail,
            status: false,
            code: 32
        }

    compress.setMuted(isMuted);
    compress.setCollapsed(isCollapsed);
    
    await compress.writeFile({
        filename: fileName,
        buffer: file.buffer,
        options: "binary"
    }, async () => {
        console.log(fileType.toLowerCase());
        await compress.compressImages(file);
    });
    
    if (file.originalname.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/)) {
        const image = sharp(file.buffer);
        const metaData = (await image.metadata()) as any;

        height = metaData.height;
        width = metaData.width;
    } else {
        const ffprobePromise = util.promisify(ffmpeg.ffprobe) as any;
        const metaData: any = await ffprobePromise(filePath);

        thumbnail = compress.getPath("", null, null);

        ffmpeg(compress.getPath(fileName, true, true))
        .takeScreenshots({
            timemarks: [
                "00:00:02.000"
            ],
            size: `${metaData.streams[0].width}x${metaData.streams[0].height}`,
            filename: "thumbnail"
        }, thumbnail)
        .output(compress.getPath(id + "." + "mp3", true, true))
        .audioCodec("libmp3lame")
        .on("error", (err) => {
            console.error("Error extracting audio:", err);
        })        
        .run();

       
          
        ffmpeg(compress.getPath(fileName, true, true))
        .setStartTime(0)
        .setDuration(5)
        .outputOptions([
            '-pix_fmt rgb24',
            '-r 10',
            '-vf scale=320:-1',
            '-loop 0'
        ])
        .output(compress.getPath(id + "." + "gif", true, true))        
        .on("error", (err) => {
            console.error("Error creating GIF:", err);
        })       
        .run();

        if (metaData) {
            height = metaData.streams[0].height;
            width = metaData.streams[0].width;
            duration = Math.floor(metaData.streams[0].duration);
        }
    }

    /*
    return {
        status: false,
        code: 32, // 32 = desteklenmeyen dosya türü
    }
    */

    return {
        id,
        height: height,
        width: width,
        duration: duration,
        fileType: fileType,
        thumbnail: thumbnail,
        status: true,
        code: 0
    };
}