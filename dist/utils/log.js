/**
 * Logs a message to the console
 *
 * `console.error` is used since standard input/output is used as transport for MCP
 */
export const debugLog = (...args) => {
    console.error(...args);
};
