// Stub types to replace workspace dependencies

import { z } from "zod";

// MCP Tool types
export const SnapshotTool = z.object({
  name: z.literal("browser_snapshot"),
  description: z.literal("Capture accessibility snapshot of the current page. Use this for getting references to elements to interact with."),
  arguments: z.object({})
});

export const ClickTool = z.object({
  name: z.literal("browser_click"),
  description: z.literal("Perform click on a web page"),
  arguments: z.object({
    element: z.string().describe("Human-readable element description used to obtain permission to interact with the element"),
    ref: z.string().describe("Exact target element reference from the page snapshot")
  })
});

export const TypeTool = z.object({
  name: z.literal("browser_type"),
  description: z.literal("Type text into editable element"),
  arguments: z.object({
    element: z.string().describe("Human-readable element description used to obtain permission to interact with the element"),
    ref: z.string().describe("Exact target element reference from the page snapshot"),
    text: z.string().describe("Text to type into the element"),
    submit: z.boolean().describe("Whether to submit entered text (press Enter after)")
  })
});

export const HoverTool = z.object({
  name: z.literal("browser_hover"),
  description: z.literal("Hover over element on page"),
  arguments: z.object({
    element: z.string().describe("Human-readable element description used to obtain permission to interact with the element"),
    ref: z.string().describe("Exact target element reference from the page snapshot")
  })
});

export const DragTool = z.object({
  name: z.literal("browser_drag"),
  description: z.literal("Drag element to another location"),
  arguments: z.object({
    startElement: z.string().describe("Starting element description"),
    endElement: z.string().describe("Target element description")
  })
});

export const SelectOptionTool = z.object({
  name: z.literal("browser_select_option"),
  description: z.literal("Select an option in a dropdown"),
  arguments: z.object({
    element: z.string().describe("Human-readable element description used to obtain permission to interact with the element"),
    ref: z.string().describe("Exact target element reference from the page snapshot"),
    values: z.array(z.string()).describe("Array of values to select in the dropdown. This can be a single value or multiple values.")
  })
});

export const ScreenshotTool = z.object({
  name: z.literal("browser_screenshot"),
  description: z.literal("Take a screenshot of the current page"),
  arguments: z.object({})
});

export const GetConsoleLogsTool = z.object({
  name: z.literal("browser_get_console_logs"),
  description: z.literal("Get the console logs from the browser"),
  arguments: z.object({})
});

export const NavigateTool = z.object({
  name: z.literal("browser_navigate"),
  description: z.literal("Navigate to a URL"),
  arguments: z.object({
    url: z.string().describe("The URL to navigate to")
  })
});

export const GoBackTool = z.object({
  name: z.literal("browser_go_back"),
  description: z.literal("Go back to the previous page"),
  arguments: z.object({})
});

export const GoForwardTool = z.object({
  name: z.literal("browser_go_forward"),
  description: z.literal("Go forward to the next page"),
  arguments: z.object({})
});

export const WaitTool = z.object({
  name: z.literal("browser_wait"),
  description: z.literal("Wait for a specified time in seconds"),
  arguments: z.object({
    time: z.number().describe("The time to wait in seconds")
  })
});

export const PressKeyTool = z.object({
  name: z.literal("browser_press_key"),
  description: z.literal("Press a key on the keyboard"),
  arguments: z.object({
    key: z.string().describe("Name of the key to press or a character to generate, such as `ArrowLeft` or `a`")
  })
});

// Config types
export const mcpConfig = {
  maxRetries: 3,
  timeout: 10000,
  defaultWsPort: 9002,
  errors: {
    noConnectedTab: "No connected tab"
  }
};

export const appConfig = {
  port: 3001,
  host: "localhost",
  name: "@browsermcp/mcp"
};

// Message types
export type MessagePayload<T, K extends keyof T> = T[K] extends { args: infer A } ? A : never;

export type MessageType<T> = keyof T;

export interface SocketMessageMap extends Record<string, { args: any; response: any }> {
  browser_snapshot: { args: {}; response: string };
  browser_click: { args: { element: string; ref: string }; response: void };
  browser_type: { args: { element: string; ref: string; text: string; submit: boolean }; response: void };
  browser_hover: { args: { element: string; ref: string }; response: void };
  browser_select_option: { args: { element: string; ref: string; values: string[] }; response: void };
  browser_navigate: { args: { url: string }; response: void };
  browser_go_back: { args: {}; response: void };
  browser_go_forward: { args: {}; response: void };
  browser_wait: { args: { time: number }; response: void };
  browser_press_key: { args: { key: string }; response: void };
  browser_get_console_logs: { args: {}; response: any[] };
  browser_screenshot: { args: {}; response: string };
  browser_drag: { args: { startElement: string; endElement: string }; response: void };
  getUrl: { args: undefined; response: string };
  getTitle: { args: undefined; response: string };
}

// Utility functions
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Socket message sender
export const createSocketMessageSender = <T extends Record<string, { args: any; response: any }>>(ws: any) => {
  const sendSocketMessage = async <K extends keyof T>(
    type: K,
    payload: T[K]['args'],
    options: { timeoutMs?: number } = { timeoutMs: 30000 }
  ): Promise<T[K]['response']> => {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substr(2, 9);
      const message = { id, type, data: payload };
      
      const timeout = setTimeout(() => {
        reject(new Error(`Message timeout: ${String(type)}`));
      }, options.timeoutMs);
      
      const handleMessage = (response: any) => {
        if (response.id === id) {
          clearTimeout(timeout);
          ws.off('message', handleMessage);
          resolve(response.data);
        }
      };
      
      ws.on('message', handleMessage);
      ws.send(JSON.stringify(message));
    });
  };
  
  return { sendSocketMessage };
};