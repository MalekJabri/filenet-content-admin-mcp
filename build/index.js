#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerChoiceListTools } from "./tools/choiceList.js";
import { registerPropertyTemplateTools } from "./tools/propertyTemplate.js";
import { registerDocumentClassTools } from "./tools/documentClass.js";
import { registerFolderClassTools } from "./tools/folderClass.js";
import { registerSecurityTools } from "./tools/security.js";
import { registerSearchTools } from "./tools/search.js";
import { registerEventActionTools } from "./tools/eventAction.js";
const server = new McpServer({
    name: "filenet-content-services-mcp",
    version: "0.1.0",
});
registerChoiceListTools(server);
registerPropertyTemplateTools(server);
registerDocumentClassTools(server);
registerFolderClassTools(server);
registerSecurityTools(server);
registerSearchTools(server);
registerEventActionTools(server);
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("filenet-content-services-mcp running on stdio");
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
