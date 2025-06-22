import zodToJsonSchema from "zod-to-json-schema";
import { ClickTool, DragTool, HoverTool, SelectOptionTool, SnapshotTool, TypeTool, } from "../types/index";
import { captureAriaSnapshot } from "@/utils/aria-snapshot";
export const snapshot = {
    schema: {
        name: SnapshotTool.shape.name.value,
        description: SnapshotTool.shape.description.value,
        inputSchema: zodToJsonSchema(SnapshotTool.shape.arguments),
    },
    handle: async (context) => {
        return await captureAriaSnapshot(context);
    },
};
export const click = {
    schema: {
        name: ClickTool.shape.name.value,
        description: ClickTool.shape.description.value,
        inputSchema: zodToJsonSchema(ClickTool.shape.arguments),
    },
    handle: async (context, params) => {
        const validatedParams = ClickTool.shape.arguments.parse(params);
        await context.sendSocketMessage("browser_click", validatedParams);
        const snapshot = await captureAriaSnapshot(context);
        return {
            content: [
                {
                    type: "text",
                    text: `Clicked "${validatedParams.element}"`,
                },
                ...snapshot.content,
            ],
        };
    },
};
export const drag = {
    schema: {
        name: DragTool.shape.name.value,
        description: DragTool.shape.description.value,
        inputSchema: zodToJsonSchema(DragTool.shape.arguments),
    },
    handle: async (context, params) => {
        const validatedParams = DragTool.shape.arguments.parse(params);
        await context.sendSocketMessage("browser_drag", validatedParams);
        const snapshot = await captureAriaSnapshot(context);
        return {
            content: [
                {
                    type: "text",
                    text: `Dragged "${validatedParams.startElement}" to "${validatedParams.endElement}"`,
                },
                ...snapshot.content,
            ],
        };
    },
};
export const hover = {
    schema: {
        name: HoverTool.shape.name.value,
        description: HoverTool.shape.description.value,
        inputSchema: zodToJsonSchema(HoverTool.shape.arguments),
    },
    handle: async (context, params) => {
        const validatedParams = HoverTool.shape.arguments.parse(params);
        await context.sendSocketMessage("browser_hover", validatedParams);
        const snapshot = await captureAriaSnapshot(context);
        return {
            content: [
                {
                    type: "text",
                    text: `Hovered over "${validatedParams.element}"`,
                },
                ...snapshot.content,
            ],
        };
    },
};
export const type = {
    schema: {
        name: TypeTool.shape.name.value,
        description: TypeTool.shape.description.value,
        inputSchema: zodToJsonSchema(TypeTool.shape.arguments),
    },
    handle: async (context, params) => {
        const validatedParams = TypeTool.shape.arguments.parse(params);
        await context.sendSocketMessage("browser_type", validatedParams);
        const snapshot = await captureAriaSnapshot(context);
        return {
            content: [
                {
                    type: "text",
                    text: `Typed "${validatedParams.text}" into "${validatedParams.element}"`,
                },
                ...snapshot.content,
            ],
        };
    },
};
export const selectOption = {
    schema: {
        name: SelectOptionTool.shape.name.value,
        description: SelectOptionTool.shape.description.value,
        inputSchema: zodToJsonSchema(SelectOptionTool.shape.arguments),
    },
    handle: async (context, params) => {
        const validatedParams = SelectOptionTool.shape.arguments.parse(params);
        await context.sendSocketMessage("browser_select_option", validatedParams);
        const snapshot = await captureAriaSnapshot(context);
        return {
            content: [
                {
                    type: "text",
                    text: `Selected option in "${validatedParams.element}"`,
                },
                ...snapshot.content,
            ],
        };
    },
};
