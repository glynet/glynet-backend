import fs from "fs";
// @ts-ignore
import {compress} from "compress-images/promise";

import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import {generateSnowflakeID} from "./generator";
import sharp from "sharp";
import util from "util";
import path from "path";
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

class Compress {
    path: string;
    mainFolder: string;
    keepOriginalFile: boolean;
    shotThumbnailDirectory: string;
    isMuted: boolean;
    collapsed: boolean;
    constructor() {
        this.path = "" as string;
        this.mainFolder = "" as string;
        this.keepOriginalFile = false;
        this.shotThumbnailDirectory = "" as string;
        this.isMuted = false;
        this.collapsed = false;
    }
    setMuted(muted: boolean) {
        this.isMuted = muted;
    }
    setCollapsed(collapsed: boolean) {
        this.collapsed = collapsed;
    }
    setShotThumbnailImage(dir: string) {
        this.shotThumbnailDirectory = dir;
    }
    setPath(dir: string) {
        this.path = dir;
        this.setMainFolder();
    }

    keepMainFile(boo: boolean) {
        this.keepOriginalFile = boo;
    }

    setMainFolder() {
        const iskeepingFile = this.keepOriginalFile ? this.path + "original/" : this.path;

        fs.mkdirSync(iskeepingFile, {
            recursive: true,
        });
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

    writeFile(file: string, buffer: any, type: any, func: any) {
        fs.writeFile(this.path + "original/" + file, buffer, type, func);
    }
    whatBitrate (bytes: number) {
      const ONE_MB = 1000000
      const BIT = 56 // i found that 28 are good point fell free to change it as you feel right
      const diff = Math.floor(bytes / ONE_MB)
      if (diff < 5) {
        return 128
      } else {
        return Math.floor(diff * BIT * 1.1)
      }
    }
    async compressImages(r: any, isVideo: any) {
        const type = r.mimetype.split("/")[1];
        const quality = 50;
       
        if (isVideo) {
            const vidPeg = ffmpeg(this.getPath(r.filename + "." + type, true, null))
            .fps(30)
            .addOptions(["-crf 28"])
            .videoCodec('libx264')

            .output(this.getPath(r.filename + "." + type, true, null).replace("/original", ""))
            .fps(30)
            // .addOptions(["-crf 28"])
            .videoCodec('libx264')
            .on('error', (error) => console.log(error))
            .on('end', () => console.log(""))

            if (this.isMuted)
                vidPeg.withNoAudio();

            if (this.path.split("/").includes("shots"))  {
                if (this.collapsed) {
                    //vidPeg.addOptions([`-filter:v drawtext=fontfile=${path.resolve(__dirname, "..", "..", "..", "static", "assets", "fonts", "Gilroy-Bold", "Gilroy-Bold.ttf")}:text=glynet.com/@sinojektif:fontsize=10:fontcolor=white:x=0:y=10:shadowcolor=black:shadowx=2:shadowy=2,scale=-1:1280,crop='min(720,1*ih)':'min(iw/1,ih)`])

                    // vidPeg.addOptions([`-filter:v scale=w=1280:h=720,drawtext=text='watermarkText':x=W/2:y=H-th-10:fontsize=72:fontcolor=green -vcodec libx264 -crf 10 ${this.getPath(r.filename + "." + type, true, null).replace("/original", "")}`])

                    // vidPeg.videoFilters(data).size("720x1280")


                } else {
                    vidPeg.size("720x1280").aspect("9:16").autopad()
                    //.addOptions([`-filter:v drawtext=fontfile=${path.resolve(__dirname, "..", "..", "..", "static", "assets", "fonts", "Gilroy-Bold", "Gilroy-Bold.ttf")}:text=glynet.com/@sinojektif:fontsize=10:fontcolor=white:x=0:y=10:shadowcolor=black:shadowx=2:shadowy=2`])
                }
            }

            vidPeg.run()
            console.log("video muteli mi?", this.isMuted);
        } else {
            const currentPath = this.getPath(r.filename + "." + type, true, null);
            const isCollapsed = this.collapsed;
            await compress({
                source: this.getPath(r.filename + "." + type, true, null),
                destination: this.getPath("", null, null),
                async onProgress () {
                    if (currentPath.split("/").includes("shots")) {
                        const image = await sharp(currentPath)
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
        const filePath = this.getPath(r.filename + "." + type, true, null);
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

            if (metaData) {
                contentHeight = metaData.streams[0].height;
                contentWidth = metaData.streams[0].width;
            }

            mediaType = "video";
        }


        return {
            height: contentHeight,
            width: contentWidth,
            type: mediaType,
            format: r.mimetype.split("/")[1],
            url: this.getPath(r.filename + "." + type, null, true)
        }

    }
}

export default Compress;
