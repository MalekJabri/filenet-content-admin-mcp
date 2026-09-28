import { z } from "zod";
import { executeREST } from "../client.js";
/**
 * Base REST path for event actions within a given repository.
 * IBM FileNet Content Services REST API:
 *   /content-services/api/v1/repositories/{repositoryId}/event-actions
 */
function eventActionPath(repositoryId, eventActionId) {
    const base = `/api/v1/repositories/${encodeURIComponent(repositoryId)}/event-actions`;
    return eventActionId ? `${base}/${encodeURIComponent(eventActionId)}` : base;
}
// ---------------------------------------------------------------------------
// Shared Zod schemas for subscription properties
// ---------------------------------------------------------------------------
const subscriptionSchema = z.object({
    subscriptionName: z
        .string()
        .describe("Unique name for the subscription"),
    eventClass: z
        .string()
        .describe("The CE class name that triggers the event (e.g. Document, Folder, or a custom class)"),
    subscriptionType: z
        .enum(["CREATION", "UPDATE", "DELETION", "CHECK_IN", "CHECK_OUT", "FILE", "UNFILE", "PUBLISH"])
        .describe("The type of event that triggers the subscription"),
    includeSubclasses: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to include subclasses of the event class (default: true)"),
    isEnabled: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether the subscription is active (default: true)"),
});
export function registerEventActionTools(server) {
    // -------------------------------------------------------------------------
    // CREATE event action
    // -------------------------------------------------------------------------
    server.registerTool("create_event_action", {
        description: "Creates a new Content Event Webhook event action with a subscription in a FileNet " +
            "repository. The webhook will call the specified URL when the subscribed event occurs. " +
            "Returns the created event action object including its id.",
        inputSchema: z.object({
            repositoryId: z
                .string()
                .describe("Repository symbolic identifier (e.g. OS1)"),
            eventActionName: z
                .string()
                .describe("Unique name for the event action"),
            webhookUrl: z
                .string()
                .url()
                .describe("The HTTPS endpoint that Content Services will POST events to"),
            webhookSecret: z
                .string()
                .optional()
                .describe("Optional HMAC-SHA256 secret used to sign the webhook payload. " +
                "The receiver can use this to verify authenticity."),
            subscription: subscriptionSchema.describe("The subscription definition that specifies which CE events trigger this action"),
        }),
    }, async ({ repositoryId, eventActionName, webhookUrl, webhookSecret, subscription }) => {
        try {
            const body = {
                eventActionName,
                eventActionType: "WEBHOOK",
                webhookConfiguration: {
                    webhookUrl,
                    ...(webhookSecret ? { webhookSecret } : {}),
                },
                subscriptions: [
                    {
                        subscriptionName: subscription.subscriptionName,
                        eventClass: subscription.eventClass,
                        subscriptionType: subscription.subscriptionType,
                        includeSubclasses: subscription.includeSubclasses,
                        isEnabled: subscription.isEnabled,
                    },
                ],
            };
            const result = await executeREST("POST", eventActionPath(repositoryId), body);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to create event action: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // -------------------------------------------------------------------------
    // UPDATE event action
    // -------------------------------------------------------------------------
    server.registerTool("update_event_action", {
        description: "Updates an existing Content Event Webhook event action (and optionally its subscription) " +
            "in a FileNet repository. Only the fields you supply are changed. " +
            "Returns the updated event action object.",
        inputSchema: z.object({
            repositoryId: z
                .string()
                .describe("Repository symbolic identifier (e.g. OS1)"),
            eventActionId: z
                .string()
                .describe("The GUID or name of the event action to update"),
            eventActionName: z
                .string()
                .optional()
                .describe("New name for the event action"),
            webhookUrl: z
                .string()
                .url()
                .optional()
                .describe("New webhook endpoint URL"),
            webhookSecret: z
                .string()
                .optional()
                .describe("New HMAC-SHA256 secret for signing webhook payloads"),
            subscription: subscriptionSchema
                .partial()
                .optional()
                .describe("Partial subscription properties to update"),
        }),
    }, async ({ repositoryId, eventActionId, eventActionName, webhookUrl, webhookSecret, subscription }) => {
        try {
            const body = {};
            if (eventActionName !== undefined) {
                body.eventActionName = eventActionName;
            }
            if (webhookUrl !== undefined || webhookSecret !== undefined) {
                const webhookConfiguration = {};
                if (webhookUrl !== undefined)
                    webhookConfiguration.webhookUrl = webhookUrl;
                if (webhookSecret !== undefined)
                    webhookConfiguration.webhookSecret = webhookSecret;
                body.webhookConfiguration = webhookConfiguration;
            }
            if (subscription && Object.keys(subscription).length > 0) {
                body.subscriptions = [subscription];
            }
            const result = await executeREST("PUT", eventActionPath(repositoryId, eventActionId), body);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to update event action: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // -------------------------------------------------------------------------
    // GET (retrieve) event action
    // -------------------------------------------------------------------------
    server.registerTool("get_event_action", {
        description: "Retrieves a single Content Event Webhook event action and its subscription details " +
            "from a FileNet repository by its id or name.",
        inputSchema: z.object({
            repositoryId: z
                .string()
                .describe("Repository symbolic identifier (e.g. OS1)"),
            eventActionId: z
                .string()
                .describe("The GUID or name of the event action to retrieve"),
        }),
    }, async ({ repositoryId, eventActionId }) => {
        try {
            const result = await executeREST("GET", eventActionPath(repositoryId, eventActionId));
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to get event action: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // -------------------------------------------------------------------------
    // SEARCH event actions
    // -------------------------------------------------------------------------
    server.registerTool("search_event_actions", {
        description: "Searches for Content Event Webhook event actions in a FileNet repository. " +
            "Returns a list of event actions matching the optional name filter. " +
            "Leave filter empty to list all event actions in the repository.",
        inputSchema: z.object({
            repositoryId: z
                .string()
                .describe("Repository symbolic identifier (e.g. OS1)"),
            nameFilter: z
                .string()
                .optional()
                .describe("Optional partial event action name to filter results (case-insensitive substring match)"),
            pageSize: z
                .number()
                .int()
                .min(1)
                .max(1000)
                .default(100)
                .describe("Maximum number of results to return (default 100)"),
            skipCount: z
                .number()
                .int()
                .min(0)
                .default(0)
                .describe("Number of results to skip for pagination (default 0)"),
        }),
    }, async ({ repositoryId, nameFilter, pageSize, skipCount }) => {
        try {
            const params = {
                maxItems: String(pageSize),
                skipCount: String(skipCount),
            };
            if (nameFilter) {
                params.filter = nameFilter;
            }
            const result = await executeREST("GET", eventActionPath(repositoryId), undefined, params);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to search event actions: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // -------------------------------------------------------------------------
    // DELETE event action
    // -------------------------------------------------------------------------
    server.registerTool("delete_event_action", {
        description: "Deletes a Content Event Webhook event action (and all its subscriptions) from a " +
            "FileNet repository. This operation is irreversible.",
        inputSchema: z.object({
            repositoryId: z
                .string()
                .describe("Repository symbolic identifier (e.g. OS1)"),
            eventActionId: z
                .string()
                .describe("The GUID or name of the event action to delete"),
        }),
    }, async ({ repositoryId, eventActionId }) => {
        try {
            await executeREST("DELETE", eventActionPath(repositoryId, eventActionId));
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({ success: true, message: `Event action '${eventActionId}' deleted successfully.` }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to delete event action: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    });
}
