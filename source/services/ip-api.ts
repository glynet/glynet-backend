import axios from "axios";

type ReturnType = {
    status: string;
    timezone: string;
    location: {
        countryCode: string;
        country: string;
        city: string;
        region: string;
        zip: number;
        full: string;
    };
    isp: string;
    address: string;
};

export async function getIPDetails(ip: any): Promise<ReturnType> {
    let finalIp = ip;

    if (
        ip === "::ffff:127.0.0.1" ||
        ip === "::1"
    ) {
        finalIp = "185.65.135.253";
    }

    const errResponse = {
        status: "error",
        timezone: "Europe/Istanbul",
        location: {
            countryCode: "TR",
            country: "Turkey",
            city: "Istanbul",
            region: "Beşiktaş",
            zip: 34110,
            full: "Beşiktaş, Istanbul, Turkey",
        },
        isp: "",
        address: finalIp,
    };

    try {
        const response = await axios.get(`http://ip-api.com/json/${finalIp}`);
        const data = response.data;
        
        if (data.status === "success") {
            return {
                status: "success",
                timezone: data.timezone,
                location: {
                    countryCode: data.countryCode,
                    country: data.country,
                    city: data.city,
                    region: data.regionName,
                    zip: Number(data.zip),
                    full: `${
                        data.city === data.regionName ? "" : data.regionName
                    }, ${data.city}, ${data.country}`,
                },
                isp: data.isp,
                address: data.query,
            };
        } else {
            return errResponse;
        }
    } catch (e) {
        return errResponse;
    }
}
