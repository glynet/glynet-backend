import { authenticator } from "otplib";
import qrcode from "qrcode";
import { createCanvas, loadImage } from "canvas";

function totpCode(secret: string) {
    return authenticator.generate(secret);
}

function totpSecret() {
    return authenticator.generateSecret();
}

async function totpQrCode(user: string, secret: string) {
    const otpauth = authenticator.keyuri(user, "Glynet", secret);

    async function create(dataForQRcode: string, center_image: string, width: number, cwidth: number) {
        const canvas = createCanvas(width, width);
        qrcode.toCanvas(
            canvas,
            dataForQRcode,
            {
                errorCorrectionLevel: "H",
                margin: 1,
                width,
                color: {
                    dark: "#000000",
                    light: "#ffffff",
                },
            }
        );

        const ctx = canvas.getContext("2d");
        const img = await loadImage(center_image);
        const center = (width - cwidth) / 2;
        ctx.drawImage(img, center, center, cwidth, cwidth);
        return canvas.toDataURL("image/png");
    }

    return await create(
        otpauth,
        __dirname + "/../../../static/assets/images/qr-logo.png",
        512,
        140
    );
}

export { totpCode, totpSecret, totpQrCode };
