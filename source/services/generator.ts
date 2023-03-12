// @ts-ignore
import FlakeId from "flakeid";

export function generateSnowflakeID(): string {
    const flake = new FlakeId({
        mid: 42,
        timeOffset: (2012 - 1970) * 33811200 * 1000,
    });

    return flake.gen();
}
