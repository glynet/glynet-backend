// @ts-ignore
import nodemailer from "nodemailer";
import fs from "fs";

interface ISendMail {
    from: string;
    to: string;
    subject: string;
    title: string;
    content: string;
    button?: {
        text: string;
        url: string;
    }
}

function replaceAll(string: string, search: string, replace: string) {
    return string.split(search).join(replace);
}

function sendMail(data: ISendMail): boolean {
    const content = fs.readFileSync(__dirname + "/mailTemplate.html", "utf-8");
    const fromAdress: string = `${data.from}@glynet.com`;

    const transporter = nodemailer.createTransport({
        port: 465,
        host: "smtp.yandex.com",
        auth: {
            user: fromAdress,
            pass: "glynet1996",
        },
        secure: true,
    });

    let html = replaceAll(content.toString(), "__TITLE__", data.title);

    if (data.button) {
        html = replaceAll(html, "__BUTTON__", `
            <tr>
                <td class="h-auto" valign="bottom" height="70" align="center" style="padding:0;Margin:0;padding-top:10px;padding-bottom:10px">
                    <span class="msohide es-button-border" style="border-style:solid;border-color:#2CB543;background:#2dc9e8;border-width:0px;display:inline-block;border-radius:30px;width:auto;mso-hide:all">
                        <a href="${data.button.url}" class="es-button msohide" target="_blank" style="mso-style-priority:100 !important;text-decoration:none;-webkit-text-size-adjust:none;-ms-text-size-adjust:none;mso-line-height-rule:exactly;color:#FFFFFF;font-size:20px;border-style:solid;border-color:#2dc9e8;border-width:10px 30px 10px 30px;display:inline-block;background:#2dc9e8;border-radius:30px;font-family:helvetica, 'helvetica neue', arial, verdana, sans-serif;font-weight:normal;font-style:normal;line-height:24px;width:auto;text-align:center;mso-hide:all">
                            ${data.button.text}
                        </a>
                    </span>
                </td>
            </tr>
        `);
    } else {
        html = replaceAll(html, "__BUTTON__", "");
    }

    html = replaceAll(html, "__CONTENT__", data.content);

    const mailData = {
        from: fromAdress,
        to: data.to,
        subject: data.subject,
        html
    };

    transporter.sendMail(mailData, (err: any, info: any) => {
        if (err) {
            console.log(err);
            return false;
        } else {
            console.log(info);
            return true;
        }
    });

    return false;
}

export { sendMail };
