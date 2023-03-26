// @ts-ignore
import {compress} from "compress-images/promise";
import fs from "fs";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import sharp from "sharp";
import util from "util";
import moment from "moment";
import { AcceptTypes } from "./import-files";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

type WriteFile = {
    filename: string;
    buffer: any;
    options: any;
}

export default class Compress {
    filename: string = "";
    path: string = "";
    mainFolder: string = "";
    keepOriginal: boolean = false;
    isMuted: boolean = false;
    isCollapsed: boolean = false;

    setMuted(muted: boolean) {
        this.isMuted = muted;
    }

    setCollapsed(isCollapsed: boolean) {
        this.isCollapsed = isCollapsed;
    }

    setKeepOriginal(keep: boolean) {
        this.keepOriginal = keep;
    }

    setPath(path: string) {
        this.path = path;
        const iskeepingFile = this.keepOriginal ? path + "original/" : path;
        
        fs.mkdirSync(iskeepingFile, {
            recursive: true,
        });
    }

    getBitrate(bytes: number) {
        const ONE_MB = 1000000;
        const BIT = 56;

        const diff = Math.floor(bytes / ONE_MB);
        
        if (diff < 5) {
            return 128
        } else {
            return Math.floor(diff * BIT * 1.1)
        }
    }

    async writeFile({ filename, buffer, options }: WriteFile, callback?: any) {
        console.log(this.path, filename);
        this.filename = filename;

        return fs.writeFile(
            this.path + "original/" + filename,
            buffer,
            options,
            callback
        );
    }

    getPath(dir: string = "", getAsOriginalDir: any, deleteDots: any) {
        if (dir === "") {
            if (deleteDots) return this.path.replace("./", "");
            return this.path;
        } else {
            let xd = this.path + "original/" + dir;

            if (getAsOriginalDir && deleteDots)
                return xd.replace("./", "");

            if (getAsOriginalDir)
                return xd;

            xd = this.path + dir;

            if (deleteDots)
                return xd.replace("./", "");

            return this.path + dir;
        }
    }

    async compressImages(r: any) {
        const type = r.originalname.split(".")[r.originalname.split(".").length - 1];
        const quality = 50;
       
        if (type === "mp4" || type === "mov") {
            console.log(moment());
            console.log(this.getPath(this.filename, true, null))

            const vidPeg =
                ffmpeg(this.getPath(this.filename, true, null))
                .fps(30)
                .addOptions(["-crf 30", "-vcodec h264"])
                // .videoCodec('libx264')
                .outputFormat("mp4")
                .output(this.getPath(this.filename, true, null).replace("/original", ""))
                .on('error', (error) => console.log(error))
                .on('end', () => console.log("video codeği işlendi", moment()))

            if (this.isMuted)
                vidPeg.withNoAudio();

            /* if (this.path.split("/").includes("shots"))  {
                if (this.isCollapsed) {
                    //vidPeg.addOptions([`-filter:v drawtext=fontfile=${path.resolve(__dirname, "..", "..", "..", "static", "assets", "fonts", "Gilroy-Bold", "Gilroy-Bold.ttf")}:text=glynet.com/@sinojektif:fontsize=10:fontcolor=white:x=0:y=10:shadowcolor=black:shadowx=2:shadowy=2,scale=-1:1280,crop='min(720,1*ih)':'min(iw/1,ih)`])
                    // vidPeg.addOptions([`-filter:v scale=w=1280:h=720,drawtext=text='watermarkText':x=W/2:y=H-th-10:fontsize=72:fontcolor=green -vcodec libx264 -crf 10 ${this.getPath(this.filename, true, null).replace("/original", "")}`])
                    // vidPeg.videoFilters(data).size("720x1280")
                } else {
                    vidPeg.size("720x1280").aspect("9:16").autopad()
                    //.addOptions([`-filter:v drawtext=fontfile=${path.resolve(__dirname, "..", "..", "..", "static", "assets", "fonts", "Gilroy-Bold", "Gilroy-Bold.ttf")}:text=glynet.com/@sinojektif:fontsize=10:fontcolor=white:x=0:y=10:shadowcolor=black:shadowx=2:shadowy=2`])
                }
            } */

            vidPeg.run();
            console.log("video muteli mi?", this.isMuted);
        } else {
            const currentPath = this.getPath(this.filename, true, null);
            const isCollapsed = this.isCollapsed;

            await compress({
                source: this.getPath(this.filename, true, null),
                destination: this.getPath("", null, null),
                async onProgress() {
                    if (currentPath.split("/").includes("shots")) {
                        const image = await sharp(currentPath);

                        if (isCollapsed) {
                            image.resize({width: 720, height: 1280, fit: sharp.fit.cover}).toFile(currentPath.replace("/original", ""));
                        } else {
                            image.resize({width: 720, height: 1280, fit: sharp.fit.contain}).toFile(currentPath.replace("/original", ""));
                        }
                    }
                },
                enginesSetup: {
                    jpg: { engine: 'mozjpeg', command: ['-quality', quality]},
                    png: { engine: "pngquant", command: ["--quality=" + quality + "-" + quality, "-o"] },
                    svg: { engine: "svgo", command: "--multipass" },
                    gif: { engine: "gifsicle", command: false }
                }
            })
        }

        const filePath = this.getPath(this.filename, true, null);
        let mediaType: string|null;
        let contentWidth: number = 1280;
        let contentHeight: number = 720;

        if (r.originalname.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/)) {
            const image = await sharp(r.buffer);
            const metaData = (await image.metadata()) as any;

            contentHeight = metaData.height;
            contentWidth = metaData.width;
            mediaType = "image";
        } else {
            const ffprobePromise = util.promisify(ffmpeg.ffprobe);
            const metaData: any = await ffprobePromise(filePath);

            mediaType = "video";
            
            if (metaData) {
                contentHeight = metaData.streams[0].height;
                contentWidth = metaData.streams[0].width;
            }
        }

        return {
            height: contentHeight,
            width: contentWidth,
            type: mediaType,
            format: type,
            url: this.getPath(this.filename, null, true)
        }
    }
}
