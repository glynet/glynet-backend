import fetch from "node-fetch";

type ReturnType = {
    success: boolean;
};

export async function CaptchaControl(token: string): Promise<ReturnType> {
    const secret = "0xcD82b474D36331963cf0d2741E5f67526B398530";
    const response = await fetch(`https://hcaptcha.com/siteverify?secret=${secret}&response=${token}`, {
        method: "POST",
    });
    const data = await response.json() as any;
    return {
        success: data.success
    };
}
