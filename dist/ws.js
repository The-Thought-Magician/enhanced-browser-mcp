import { WebSocketServer } from "ws";
import { mcpConfig, wait } from "./types/index";
import { isPortInUse, killProcessOnPort } from "@/utils/port";
export async function createWebSocketServer(port = mcpConfig.defaultWsPort) {
    killProcessOnPort(port);
    // Wait until the port is free
    while (await isPortInUse(port)) {
        await wait(100);
    }
    return new WebSocketServer({ port });
}
