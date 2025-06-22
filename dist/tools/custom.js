import { zodToJsonSchema } from "zod-to-json-schema";
import { GetConsoleLogsTool, ScreenshotTool } from "../types/index";
export const getConsoleLogs = {
    schema: {
        name: GetConsoleLogsTool.shape.name.value,
        description: GetConsoleLogsTool.shape.description.value,
        inputSchema: zodToJsonSchema(GetConsoleLogsTool.shape.arguments),
    },
    handle: async (context, _params) => {
        const consoleLogs = await context.sendSocketMessage("browser_get_console_logs", {});
        const text = consoleLogs
            .map((log) => JSON.stringify(log))
            .join("\n");
        return {
            content: [{ type: "text", text }],
        };
    },
};
export const screenshot = {
    schema: {
        name: ScreenshotTool.shape.name.value,
        description: ScreenshotTool.shape.description.value,
        inputSchema: zodToJsonSchema(ScreenshotTool.shape.arguments),
    },
    handle: async (context, _params) => {
        const screenshot = await context.sendSocketMessage("browser_screenshot", {});
        return {
            content: [
                {
                    type: "image",
                    data: screenshot,
                    mimeType: "image/png",
                },
            ],
        };
    },
};
