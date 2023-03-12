import {generateSnowflakeID} from "./generator";
import CompressService from "./compress";
import sharp from "sharp";
import util from "util";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";

async function importFiles(files: any, path: string, limit: number = 16, customData?: any) {
    const contentData: any = [];
    const compress = new CompressService();

    let blurredUrl = "";
    let filePaths: string = "";

    compress.keepMainFile(true);
    compress.setPath(path);

    files = files.filter((r: any)=> r.size < limit * 1024 * 1024);

    if (files.length === 0)
        return { error: 93093, status: "too_high_file_size" };

    if (customData) {
        compress.setMuted(customData.muted);
        compress.setCollapsed(customData.collapsed);
    }

    for (let index = 0; index < files.length; index++) {
        const r = files[index];
        const type = r.mimetype.split("/")[1];
        const fileName = `${generateSnowflakeID()}-${Math.floor(Math.random() * 101)}`;

        files[index].filename = fileName;
        files[index].uploaded_url = compress.getPath(files[index].filename + "." + type, false, true);

        filePaths += files[index].uploaded_url + ",";
        const filePath = compress.getPath(fileName + "." + type, true, null);

        let mediaType: string|null;
        let contentWidth: number = 1280;
        let contentHeight: number = 720;
        let duration = 0;

        compress.writeFile(fileName + "." + type, r.buffer, "binary", async () => {
            const isVideo = type.toLowerCase() === "mp4";
            const input = compress.getPath(fileName + "." + type, true, null);

            if (isVideo && path.split("/").includes("shots")) {
                blurredUrl = `${generateSnowflakeID()}`
                compress.setShotThumbnailImage(blurredUrl);
            }

            compress.compressImages(files[index], isVideo);

            if (index === Number(files.length) - 1) {
                // console.log("Burası yapılacak...");
            }
        });

        if (r.originalname.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/)) {
            const image = await sharp(r.buffer);
            const metaData = (await image.metadata()) as any;

            contentHeight = metaData.height;
            contentWidth = metaData.width;
            mediaType = "image";
            if (path.split("/").includes("shots")) {
                let bluredfile = compress.getPath(`${generateSnowflakeID()}-${Math.floor(Math.random() * 101)}/`, null, null);
                fs.mkdirSync(bluredfile, {
                    recursive: true,
                });
                bluredfile += fileName + "." + type
                console.log("imagein shots imagei olduğu doğrulandı")
                await image.resize(256, 256).blur(2).toFile(bluredfile);
                console.log(bluredfile, "blurlu image buraya kaydedildi");
                blurredUrl = bluredfile.slice(2, bluredfile.length);
            }
        } else {
            const ffprobePromise = util.promisify(ffmpeg.ffprobe);
            const metaData: any = await ffprobePromise(filePath);
            if (path.split("/").includes("shots")) {
                blurredUrl = `${compress.getPath("", null, null)}${blurredUrl}.jpg`;
            }
            if (metaData) {
                contentHeight = metaData.streams[0].height;
                contentWidth = metaData.streams[0].width;
                duration = Math.floor(metaData.streams[0].duration);
                if (!duration) console.log("duration", metaData);
            }

            mediaType = "video";
        }

        contentData.push({
            height: contentHeight,
            width: contentWidth,
            type: mediaType,
            format: r.mimetype.split("/")[1],
            url: compress.getPath(fileName + "." + type, null, true),
            duration
        });
    }

    return { status: "success", filePaths: filePaths.substring(0, filePaths.length - 1), contentData, blurredUrl, shot_main: compress.getPath("", null, null) };
}

export {
    importFiles
};

