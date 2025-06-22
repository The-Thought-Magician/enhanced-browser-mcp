#!/usr/bin/env node

// src/index.ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { program } from "commander";

// src/types/index.ts
import { z } from "zod";
var SnapshotTool = z.object({
  name: z.literal("browser_snapshot"),
  description: z.literal("Capture accessibility snapshot of the current page. Use this for getting references to elements to interact with."),
  arguments: z.object({})
});
var ClickTool = z.object({
  name: z.literal("browser_click"),
  description: z.literal("Perform click on a web page"),
  arguments: z.object({
    element: z.string().describe("Human-readable element description used to obtain permission to interact with the element"),
    ref: z.string().describe("Exact target element reference from the page snapshot")
  })
});
var TypeTool = z.object({
  name: z.literal("browser_type"),
  description: z.literal("Type text into editable element"),
  arguments: z.object({
    element: z.string().describe("Human-readable element description used to obtain permission to interact with the element"),
    ref: z.string().describe("Exact target element reference from the page snapshot"),
    text: z.string().describe("Text to type into the element"),
    submit: z.boolean().describe("Whether to submit entered text (press Enter after)")
  })
});
var HoverTool = z.object({
  name: z.literal("browser_hover"),
  description: z.literal("Hover over element on page"),
  arguments: z.object({
    element: z.string().describe("Human-readable element description used to obtain permission to interact with the element"),
    ref: z.string().describe("Exact target element reference from the page snapshot")
  })
});
var DragTool = z.object({
  name: z.literal("browser_drag"),
  description: z.literal("Drag element to another location"),
  arguments: z.object({
    startElement: z.string().describe("Starting element description"),
    endElement: z.string().describe("Target element description")
  })
});
var SelectOptionTool = z.object({
  name: z.literal("browser_select_option"),
  description: z.literal("Select an option in a dropdown"),
  arguments: z.object({
    element: z.string().describe("Human-readable element description used to obtain permission to interact with the element"),
    ref: z.string().describe("Exact target element reference from the page snapshot"),
    values: z.array(z.string()).describe("Array of values to select in the dropdown. This can be a single value or multiple values.")
  })
});
var ScreenshotTool = z.object({
  name: z.literal("browser_screenshot"),
  description: z.literal("Take a screenshot of the current page"),
  arguments: z.object({})
});
var GetConsoleLogsTool = z.object({
  name: z.literal("browser_get_console_logs"),
  description: z.literal("Get the console logs from the browser"),
  arguments: z.object({})
});
var NavigateTool = z.object({
  name: z.literal("browser_navigate"),
  description: z.literal("Navigate to a URL"),
  arguments: z.object({
    url: z.string().describe("The URL to navigate to")
  })
});
var GoBackTool = z.object({
  name: z.literal("browser_go_back"),
  description: z.literal("Go back to the previous page"),
  arguments: z.object({})
});
var GoForwardTool = z.object({
  name: z.literal("browser_go_forward"),
  description: z.literal("Go forward to the next page"),
  arguments: z.object({})
});
var WaitTool = z.object({
  name: z.literal("browser_wait"),
  description: z.literal("Wait for a specified time in seconds"),
  arguments: z.object({
    time: z.number().describe("The time to wait in seconds")
  })
});
var PressKeyTool = z.object({
  name: z.literal("browser_press_key"),
  description: z.literal("Press a key on the keyboard"),
  arguments: z.object({
    key: z.string().describe("Name of the key to press or a character to generate, such as `ArrowLeft` or `a`")
  })
});
var mcpConfig = {
  maxRetries: 3,
  timeout: 1e4,
  defaultWsPort: 9002,
  errors: {
    noConnectedTab: "No connected tab"
  }
};
var appConfig = {
  port: 3001,
  host: "localhost",
  name: "@browsermcp/mcp"
};
var wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var createSocketMessageSender = (ws) => {
  const sendSocketMessage = async (type2, payload, options = { timeoutMs: 3e4 }) => {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substr(2, 9);
      const message = { id, type: type2, data: payload };
      const timeout = setTimeout(() => {
        reject(new Error(`Message timeout: ${String(type2)}`));
      }, options.timeoutMs);
      const handleMessage = (response) => {
        if (response.id === id) {
          clearTimeout(timeout);
          ws.off("message", handleMessage);
          resolve(response.data);
        }
      };
      ws.on("message", handleMessage);
      ws.send(JSON.stringify(message));
    });
  };
  return { sendSocketMessage };
};

// src/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

// src/context.ts
var noConnectionMessage = `No connection to browser extension. In order to proceed, you must first connect a tab by clicking the Browser MCP extension icon in the browser toolbar and clicking the 'Connect' button.`;
var Context = class {
  _ws;
  get ws() {
    if (!this._ws) {
      throw new Error(noConnectionMessage);
    }
    return this._ws;
  }
  set ws(ws) {
    this._ws = ws;
  }
  hasWs() {
    return !!this._ws;
  }
  async sendSocketMessage(type2, payload, options = { timeoutMs: 3e4 }) {
    const { sendSocketMessage } = createSocketMessageSender(
      this.ws
    );
    try {
      return await sendSocketMessage(type2, payload, options);
    } catch (e) {
      if (e instanceof Error && e.message === mcpConfig.errors.noConnectedTab) {
        throw new Error(noConnectionMessage);
      }
      throw e;
    }
  }
  async close() {
    if (!this._ws) {
      return;
    }
    await this._ws.close();
  }
};

// src/ws.ts
import { WebSocketServer } from "ws";

// src/utils/port.ts
import { execSync } from "child_process";
import net from "net";
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => {
      server.close(() => resolve(false));
    });
    server.listen(port);
  });
}
function killProcessOnPort(port) {
  try {
    if (process.platform === "win32") {
      execSync(
        `FOR /F "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /F /PID %a`
      );
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9`);
    }
  } catch (error) {
    console.error(`Failed to kill process on port ${port}:`, error);
  }
}

// src/ws.ts
async function createWebSocketServer(port = mcpConfig.defaultWsPort) {
  killProcessOnPort(port);
  while (await isPortInUse(port)) {
    await wait(100);
  }
  return new WebSocketServer({ port });
}

// src/server.ts
async function createServerWithTools(options) {
  const { name, version, tools, resources: resources2 } = options;
  const context = new Context();
  const server = new Server(
    { name, version },
    {
      capabilities: {
        tools: {},
        resources: {}
      }
    }
  );
  const wss = await createWebSocketServer();
  wss.on("connection", (websocket) => {
    if (context.hasWs()) {
      context.ws.close();
    }
    context.ws = websocket;
  });
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: tools.map((tool) => tool.schema) };
  });
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources: resources2.map((resource) => resource.schema) };
  });
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find((tool2) => tool2.schema.name === request.params.name);
    if (!tool) {
      return {
        content: [
          { type: "text", text: `Tool "${request.params.name}" not found` }
        ],
        isError: true
      };
    }
    try {
      const result = await tool.handle(context, request.params.arguments);
      return result;
    } catch (error) {
      return {
        content: [{ type: "text", text: String(error) }],
        isError: true
      };
    }
  });
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const resource = resources2.find(
      (resource2) => resource2.schema.uri === request.params.uri
    );
    if (!resource) {
      return { contents: [] };
    }
    const contents = await resource.read(context, request.params.uri);
    return { contents };
  });
  server.close = async () => {
    await server.close();
    await wss.close();
    await context.close();
  };
  return server;
}

// src/tools/common.ts
import { zodToJsonSchema } from "zod-to-json-schema";

// src/utils/aria-snapshot.ts
function getSnapshotConfig(url, actionContext) {
  const isFormPage = actionContext.includes("form") || actionContext.includes("input") || actionContext.includes("type");
  const isNavigation = actionContext.includes("navigate") || actionContext.includes("click");
  if (isFormPage) {
    return {
      mode: "form",
      maxTokens: 8e3,
      priorityElements: ["textbox", "button", "combobox", "checkbox", "radio", "heading"],
      includeContent: false,
      includeLayout: false
    };
  } else if (isNavigation) {
    return {
      mode: "navigation",
      maxTokens: 12e3,
      priorityElements: ["link", "button", "heading", "navigation", "menu"],
      includeContent: true,
      includeLayout: false
    };
  } else {
    return {
      mode: "interaction",
      maxTokens: 15e3,
      priorityElements: ["button", "link", "textbox", "heading", "list", "article"],
      includeContent: true,
      includeLayout: true
    };
  }
}
function analyzeElements(snapshot2) {
  const lines = snapshot2.split("\n");
  const critical = [];
  const important = [];
  const optional = [];
  const stats = {
    buttons: 0,
    links: 0,
    inputs: 0,
    headings: 0,
    navigation: 0,
    forms: 0,
    menus: 0,
    content: 0
  };
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.includes("button") && (trimmed.includes("submit") || trimmed.includes("send") || trimmed.includes("save") || trimmed.includes("login"))) {
      critical.push(line);
      stats.buttons++;
    } else if (trimmed.includes("textbox") || trimmed.includes("combobox") || trimmed.includes("checkbox")) {
      critical.push(line);
      stats.inputs++;
    } else if (trimmed.includes("navigation") || trimmed.includes("menu")) {
      critical.push(line);
      stats.navigation++;
    } else if (trimmed.includes("heading") && !trimmed.includes("[level=5]") && !trimmed.includes("[level=6]")) {
      important.push(line);
      stats.headings++;
    } else if (trimmed.includes("link") && !trimmed.includes("javascript:") && !trimmed.includes("#")) {
      important.push(line);
      stats.links++;
    } else if (trimmed.includes("button")) {
      important.push(line);
      stats.buttons++;
    } else {
      optional.push(line);
      if (trimmed.includes("text:") || trimmed.includes("paragraph")) stats.content++;
    }
  });
  return { critical, important, optional, stats };
}
function createIntelligentSnapshot(snapshot2, config, url) {
  if (typeof snapshot2 !== "string") {
    return { compressed: String(snapshot2), compressionReport: "No compression needed" };
  }
  const analysis = analyzeElements(snapshot2);
  const lines = snapshot2.split("\n");
  let result = [];
  let currentTokens = 0;
  const docStart = lines.slice(0, Math.min(5, lines.length));
  result.push(...docStart);
  currentTokens += docStart.join("\n").length;
  for (const line of analysis.critical) {
    if (currentTokens + line.length < config.maxTokens * 0.6) {
      result.push(line);
      currentTokens += line.length;
    }
  }
  for (const line of analysis.important) {
    if (currentTokens + line.length < config.maxTokens * 0.85) {
      result.push(line);
      currentTokens += line.length;
    }
  }
  if (config.includeContent) {
    for (const line of analysis.optional) {
      if (currentTokens + line.length < config.maxTokens * 0.95) {
        result.push(line);
        currentTokens += line.length;
      } else {
        break;
      }
    }
  }
  const compressionReport = `
Mode: ${config.mode} | Elements: ${analysis.stats.buttons}B ${analysis.stats.links}L ${analysis.stats.inputs}I ${analysis.stats.headings}H
Original: ${snapshot2.length} chars | Compressed: ${result.join("\n").length} chars | Ratio: ${Math.round(result.join("\n").length / snapshot2.length * 100)}%`;
  return {
    compressed: result.join("\n"),
    compressionReport
  };
}
function createTieredResponse(url, title, snapshot2, status, config) {
  const { compressed, compressionReport } = createIntelligentSnapshot(snapshot2, config, url);
  const needsSummary = typeof snapshot2 === "string" && snapshot2.length > 2e4;
  let content = `${status ? `${status}
` : ""}
- Page URL: ${url}
- Page Title: ${title}
- Snapshot Mode: ${config.mode.toUpperCase()}
${compressionReport}

## Interactive Elements Snapshot
\`\`\`yaml
${compressed}
\`\`\``;
  if (needsSummary) {
    const analysis = analyzeElements(snapshot2);
    content += `

## Page Summary
- **Interactive Elements**: ${analysis.stats.buttons} buttons, ${analysis.stats.links} links, ${analysis.stats.inputs} form inputs
- **Structure**: ${analysis.stats.headings} headings, ${analysis.stats.navigation} navigation areas
- **Content**: ${analysis.stats.content} content blocks
- **Optimization**: Showing most relevant elements for ${config.mode} context

\u{1F4A1} *This page was intelligently compressed to show the most relevant elements for your current task.*`;
  }
  return {
    content: [
      {
        type: "text",
        text: content
      }
    ]
  };
}
async function captureAriaSnapshot(context, status = "") {
  const url = await context.sendSocketMessage("getUrl", void 0);
  const title = await context.sendSocketMessage("getTitle", void 0);
  const snapshot2 = await context.sendSocketMessage("browser_snapshot", {});
  const actionContext = status.toLowerCase();
  const config = getSnapshotConfig(url || "", actionContext);
  return createTieredResponse(url, title, snapshot2, status, config);
}

// src/tools/common.ts
var navigate = (snapshot2) => ({
  schema: {
    name: NavigateTool.shape.name.value,
    description: NavigateTool.shape.description.value,
    inputSchema: zodToJsonSchema(NavigateTool.shape.arguments)
  },
  handle: async (context, params) => {
    const { url } = NavigateTool.shape.arguments.parse(params);
    await context.sendSocketMessage("browser_navigate", { url });
    if (snapshot2) {
      return captureAriaSnapshot(context);
    }
    return {
      content: [
        {
          type: "text",
          text: `Navigated to ${url}`
        }
      ]
    };
  }
});
var goBack = (snapshot2) => ({
  schema: {
    name: GoBackTool.shape.name.value,
    description: GoBackTool.shape.description.value,
    inputSchema: zodToJsonSchema(GoBackTool.shape.arguments)
  },
  handle: async (context) => {
    await context.sendSocketMessage("browser_go_back", {});
    if (snapshot2) {
      return captureAriaSnapshot(context);
    }
    return {
      content: [
        {
          type: "text",
          text: "Navigated back"
        }
      ]
    };
  }
});
var goForward = (snapshot2) => ({
  schema: {
    name: GoForwardTool.shape.name.value,
    description: GoForwardTool.shape.description.value,
    inputSchema: zodToJsonSchema(GoForwardTool.shape.arguments)
  },
  handle: async (context) => {
    await context.sendSocketMessage("browser_go_forward", {});
    if (snapshot2) {
      return captureAriaSnapshot(context);
    }
    return {
      content: [
        {
          type: "text",
          text: "Navigated forward"
        }
      ]
    };
  }
});
var wait2 = {
  schema: {
    name: WaitTool.shape.name.value,
    description: WaitTool.shape.description.value,
    inputSchema: zodToJsonSchema(WaitTool.shape.arguments)
  },
  handle: async (context, params) => {
    const { time } = WaitTool.shape.arguments.parse(params);
    await context.sendSocketMessage("browser_wait", { time });
    return {
      content: [
        {
          type: "text",
          text: `Waited for ${time} seconds`
        }
      ]
    };
  }
};
var pressKey = {
  schema: {
    name: PressKeyTool.shape.name.value,
    description: PressKeyTool.shape.description.value,
    inputSchema: zodToJsonSchema(PressKeyTool.shape.arguments)
  },
  handle: async (context, params) => {
    const { key } = PressKeyTool.shape.arguments.parse(params);
    await context.sendSocketMessage("browser_press_key", { key });
    return {
      content: [
        {
          type: "text",
          text: `Pressed key ${key}`
        }
      ]
    };
  }
};

// src/tools/custom.ts
import { zodToJsonSchema as zodToJsonSchema2 } from "zod-to-json-schema";
var getConsoleLogs = {
  schema: {
    name: GetConsoleLogsTool.shape.name.value,
    description: GetConsoleLogsTool.shape.description.value,
    inputSchema: zodToJsonSchema2(GetConsoleLogsTool.shape.arguments)
  },
  handle: async (context, _params) => {
    const consoleLogs = await context.sendSocketMessage(
      "browser_get_console_logs",
      {}
    );
    const text = consoleLogs.map((log) => JSON.stringify(log)).join("\n");
    return {
      content: [{ type: "text", text }]
    };
  }
};
var screenshot = {
  schema: {
    name: ScreenshotTool.shape.name.value,
    description: ScreenshotTool.shape.description.value,
    inputSchema: zodToJsonSchema2(ScreenshotTool.shape.arguments)
  },
  handle: async (context, _params) => {
    const screenshot2 = await context.sendSocketMessage(
      "browser_screenshot",
      {}
    );
    return {
      content: [
        {
          type: "image",
          data: screenshot2,
          mimeType: "image/png"
        }
      ]
    };
  }
};

// src/tools/snapshot.ts
import zodToJsonSchema3 from "zod-to-json-schema";
var snapshot = {
  schema: {
    name: SnapshotTool.shape.name.value,
    description: SnapshotTool.shape.description.value,
    inputSchema: zodToJsonSchema3(SnapshotTool.shape.arguments)
  },
  handle: async (context) => {
    return await captureAriaSnapshot(context);
  }
};
var click = {
  schema: {
    name: ClickTool.shape.name.value,
    description: ClickTool.shape.description.value,
    inputSchema: zodToJsonSchema3(ClickTool.shape.arguments)
  },
  handle: async (context, params) => {
    const validatedParams = ClickTool.shape.arguments.parse(params);
    await context.sendSocketMessage("browser_click", validatedParams);
    const snapshot2 = await captureAriaSnapshot(context);
    return {
      content: [
        {
          type: "text",
          text: `Clicked "${validatedParams.element}"`
        },
        ...snapshot2.content
      ]
    };
  }
};
var drag = {
  schema: {
    name: DragTool.shape.name.value,
    description: DragTool.shape.description.value,
    inputSchema: zodToJsonSchema3(DragTool.shape.arguments)
  },
  handle: async (context, params) => {
    const validatedParams = DragTool.shape.arguments.parse(params);
    await context.sendSocketMessage("browser_drag", validatedParams);
    const snapshot2 = await captureAriaSnapshot(context);
    return {
      content: [
        {
          type: "text",
          text: `Dragged "${validatedParams.startElement}" to "${validatedParams.endElement}"`
        },
        ...snapshot2.content
      ]
    };
  }
};
var hover = {
  schema: {
    name: HoverTool.shape.name.value,
    description: HoverTool.shape.description.value,
    inputSchema: zodToJsonSchema3(HoverTool.shape.arguments)
  },
  handle: async (context, params) => {
    const validatedParams = HoverTool.shape.arguments.parse(params);
    await context.sendSocketMessage("browser_hover", validatedParams);
    const snapshot2 = await captureAriaSnapshot(context);
    return {
      content: [
        {
          type: "text",
          text: `Hovered over "${validatedParams.element}"`
        },
        ...snapshot2.content
      ]
    };
  }
};
var type = {
  schema: {
    name: TypeTool.shape.name.value,
    description: TypeTool.shape.description.value,
    inputSchema: zodToJsonSchema3(TypeTool.shape.arguments)
  },
  handle: async (context, params) => {
    const validatedParams = TypeTool.shape.arguments.parse(params);
    await context.sendSocketMessage("browser_type", validatedParams);
    const snapshot2 = await captureAriaSnapshot(context);
    return {
      content: [
        {
          type: "text",
          text: `Typed "${validatedParams.text}" into "${validatedParams.element}"`
        },
        ...snapshot2.content
      ]
    };
  }
};
var selectOption = {
  schema: {
    name: SelectOptionTool.shape.name.value,
    description: SelectOptionTool.shape.description.value,
    inputSchema: zodToJsonSchema3(SelectOptionTool.shape.arguments)
  },
  handle: async (context, params) => {
    const validatedParams = SelectOptionTool.shape.arguments.parse(params);
    await context.sendSocketMessage("browser_select_option", validatedParams);
    const snapshot2 = await captureAriaSnapshot(context);
    return {
      content: [
        {
          type: "text",
          text: `Selected option in "${validatedParams.element}"`
        },
        ...snapshot2.content
      ]
    };
  }
};

// package.json
var package_default = {
  name: "@browsermcp/mcp",
  version: "0.1.3",
  description: "MCP server for browser automation using Browser MCP",
  author: "Browser MCP",
  homepage: "https://browsermcp.io",
  bugs: "https://github.com/browsermcp/mcp/issues",
  type: "module",
  bin: {
    "mcp-server-browsermcp": "dist/index.js"
  },
  files: [
    "dist"
  ],
  scripts: {
    typecheck: "tsc --noEmit",
    build: "tsc && tsup src/index.ts --format esm && shx chmod +x dist/*.js",
    prepare: "npm run build",
    postinstall: "npm run build",
    watch: "tsup src/index.ts --format esm --watch ",
    inspector: "CLIENT_PORT=9001 SERVER_PORT=9002 pnpx @modelcontextprotocol/inspector node dist/index.js"
  },
  dependencies: {
    "@modelcontextprotocol/sdk": "^1.8.0",
    commander: "^13.1.0",
    ws: "^8.18.1",
    zod: "^3.24.2",
    "zod-to-json-schema": "^3.24.3"
  },
  devDependencies: {
    "@types/ws": "^8.18.0",
    shx: "^0.3.4",
    tsup: "^8.4.0",
    typescript: "^5.6.2"
  }
};

// src/index.ts
function setupExitWatchdog(server) {
  process.stdin.on("close", async () => {
    setTimeout(() => process.exit(0), 15e3);
    await server.close();
    process.exit(0);
  });
}
var commonTools = [pressKey, wait2];
var customTools = [getConsoleLogs, screenshot];
var snapshotTools = [
  navigate(true),
  goBack(true),
  goForward(true),
  snapshot,
  click,
  hover,
  type,
  selectOption,
  ...commonTools,
  ...customTools
];
var resources = [];
async function createServer() {
  return createServerWithTools({
    name: appConfig.name,
    version: package_default.version,
    tools: snapshotTools,
    resources
  });
}
program.version("Version " + package_default.version).name(package_default.name).action(async () => {
  const server = await createServer();
  setupExitWatchdog(server);
  const transport = new StdioServerTransport();
  await server.connect(transport);
});
program.parse(process.argv);
