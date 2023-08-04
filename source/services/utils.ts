import {ContentType} from "../models/profile.model";

export function parseJSON(json: any) {
    let defaultJSON = {}

    try {
        defaultJSON = JSON.parse(json);
    } catch(e) {
        console.log(e);
    }

    return defaultJSON;
}

export function findContentType(path: string): ContentType {
    const split = path.split(".");
    const extension = split[split.length - 1];

    if (["png", "jpeg", "jpg"].includes(extension)) {
        return "image";
    } else if (["mp4"].includes(extension)) {
        return "video";
    }

    return "text";
}

export function log(color: string, text: string): void {
    return console.log(`\x1b[1m\x1b[36m⚡️[ÇENGEL]:\x1b[0m ${color}${text}\x1b[0m`);
}
