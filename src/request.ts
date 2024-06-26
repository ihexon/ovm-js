import path from "node:path";
import http from "node:http";
import type { OVMDarwinInfo, OVMDarwinState } from "./type";
import type { RequestOptions } from "http";

const generateRequest = async (option: RequestOptions): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
        http.request({
            timeout: 200,
            ...option,
        }, (response) => {
            response.setEncoding("utf8");

            let body = "";
            response.on("data", (chunk) => {
                body += chunk;
            });

            response.on("end", () => {
                const { statusCode } = response;
                if (!statusCode || statusCode >= 400) {
                    return reject(new Error(`Request Failed. Status Code: ${statusCode}, Response: ${body}`));
                }

                return resolve(body);
            });
        })
            .once("error", (error) => {
                reject(error);
            })
            .end();
    });
};

export class RequestDarwin {
    private readonly socketPath: string;

    public constructor(socketDir: string, name: string) {
        this.socketPath = path.join(socketDir, `${name}-restful.sock`);
    }

    private async request(p: string, method: string): Promise<string> {
        return await generateRequest({
            socketPath: this.socketPath,
            path: `http://ovm/${p}`,
            method: method,
        });
    }

    private async send(p: string): Promise<string> {
        switch (p) {
            case "info":
            case "state": {
                return this.request(p, "GET");
            }
            case "pause":
            case "resume":
            case "requestStop":
            case "stop": {
                return this.request(p, "POST");
            }
            default: {
                throw new Error(`Invalid request: ${p}`);
            }
        }
    }

    public async state(): Promise<OVMDarwinState> {
        return JSON.parse(await this.send("state")) as OVMDarwinState;
    }

    public async info(): Promise<OVMDarwinInfo> {
        return JSON.parse(await this.send("info")) as OVMDarwinInfo;
    }

    public async pause(): Promise<void> {
        await this.send("pause");
    }

    public async resume(): Promise<void> {
        await this.send("resume");
    }

    public async requestStop(): Promise<void> {
        await this.send("requestStop");
    }

    public async stop(): Promise<void> {
        await this.send("stop");
    }
}
