import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { executeGraphQL } from "../client.js";

/** Build a create choice list mutation with all values inlined (no typed variables). */
function buildCreateChoiceListMutation(
  repositoryIdentifier: string,
  displayName: string,
  dataType: string,
  descriptiveText: string | undefined,
  values: Array<{ value: string; displayLabel?: string }>
): string {
  const escapedRepo = repositoryIdentifier.replace(/"/g, '\\"');
  const escapedName = displayName.replace(/"/g, '\\"');
  const escapedDesc = descriptiveText ? descriptiveText.replace(/"/g, '\\"') : "";
  const descriptiveTextLine = descriptiveText
    ? `descriptiveText: "${escapedDesc}"`
    : "";

  const choiceEntries = values
    .map((v, i) => {
      const escaped = v.value.replace(/"/g, '\\"');
      const label = (v.displayLabel ?? v.value).replace(/"/g, '\\"');
      return `
          {
            ${i === 0 ? "insertAction: {}" : ""}
            choiceType: ${dataType}
            choiceStringValue: "${escaped}"
            displayNames: {
              replace: [
                { localeName: "en-us", localizedText: "${label}" }
              ]
            }
          }`;
    })
    .join("\n");

  return `
    mutation CreateChoiceList {
      admCreateChoiceList(
        repositoryIdentifier: "${escapedRepo}"
        choiceListProperties: {
          dataType: ${dataType}
          displayName: "${escapedName}"
          ${descriptiveTextLine}
          choiceValues: {
            replace: [${choiceEntries}
            ]
          }
        }
      ) {
        id
        displayName
      }
    }
  `;
}

/** Flatten repositoryRows properties array into a plain object keyed by label. */
function flattenRow(properties: Array<{ label: string; value: unknown }>): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const p of properties) {
    obj[p.label] = p.value;
  }
  return obj;
}

export function registerChoiceListTools(server: McpServer): void {
  server.registerTool(
    "create_choice_list",
    {
      description:
        "Creates a new choice list in IBM FileNet Content Services. " +
        "Returns the new choice list id and displayName.",
      inputSchema: z.object({
        repositoryId: z
          .string()
          .describe("Repository symbolic identifier (e.g. OS1)"),
        displayName: z
          .string()
          .describe("Human-readable display name for the choice list"),
        dataType: z
          .enum(["STRING", "INTEGER", "FLOAT"])
          .default("STRING")
          .describe("Data type of the choice values"),
        descriptiveText: z
          .string()
          .optional()
          .describe("Optional description of the choice list"),
        values: z
          .array(
            z.object({
              value: z.string().describe("The choice value"),
              displayLabel: z
                .string()
                .optional()
                .describe("Display label (defaults to value if omitted)"),
            })
          )
          .min(1)
          .describe("Array of choice values"),
      }),
    },
    async ({ repositoryId, displayName, dataType, descriptiveText, values }) => {
      try {
        if (!displayName.trim()) {
          return {
            content: [{ type: "text" as const, text: "Error: displayName must not be empty" }],
            isError: true,
          };
        }

        const mutation = buildCreateChoiceListMutation(
          repositoryId,
          displayName,
          dataType,
          descriptiveText,
          values
        );

        const data = await executeGraphQL<{
          admCreateChoiceList: { id: string; displayName: string };
        }>(mutation);

        const result = data.admCreateChoiceList;
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ id: result.id, displayName: result.displayName }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to create choice list: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "list_choice_lists",
    {
      description:
        "Lists choice lists in a FileNet repository using a SQL search. " +
        "Optionally filter by display name (supports SQL LIKE wildcards, e.g. 'HR%').",
      inputSchema: z.object({
        repositoryId: z
          .string()
          .describe("Repository symbolic identifier (e.g. OS1)"),
        filter: z
          .string()
          .optional()
          .describe("Optional display name filter using SQL LIKE syntax (e.g. 'HR%')"),
        pageSize: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .default(100)
          .describe("Maximum number of results to return (default 100)"),
      }),
    },
    async ({ repositoryId, filter, pageSize }) => {
      const whereClause = filter
        ? ` WHERE [DisplayName] LIKE '${filter.replace(/'/g, "''")}'`
        : "";
      const sql = `SELECT [This], [DisplayName], [DescriptiveText], [DataType], [Id], [DateCreated], [DateLastModified] FROM [ChoiceList]${whereClause} OPTIONS(TIMELIMIT 180,COUNT_LIMIT 1000)`;

      const QUERY = `
        query ListChoiceLists($repositoryIdentifier: String!, $sql: String!, $pageSize: Int) {
          repositoryRows(repositoryIdentifier: $repositoryIdentifier, sql: $sql, pageSize: $pageSize) {
            repositoryRows {
              properties {
                label
                value
              }
            }
          }
        }
      `;

      try {
        const data = await executeGraphQL<{
          repositoryRows: {
            repositoryRows: Array<{ properties: Array<{ label: string; value: unknown }> }>;
          };
        }>(QUERY, { repositoryIdentifier: repositoryId, sql, pageSize });

        const rows = (data.repositoryRows?.repositoryRows ?? []).map((r) =>
          flattenRow(r.properties)
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to list choice lists: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "get_choice_list",
    {
      description:
        "Returns a choice list by its id (GUID) or display name from a FileNet repository, including its choice values.",
      inputSchema: z.object({
        repositoryId: z
          .string()
          .describe("Repository symbolic identifier (e.g. OS1)"),
        identifier: z
          .string()
          .describe("The choice list id (GUID) or exact displayName to look up"),
      }),
    },
    async ({ repositoryId, identifier }) => {
      const QUERY = `
        query GetChoiceList($repositoryIdentifier: String!, $identifier: String!) {
          choiceList(repositoryIdentifier: $repositoryIdentifier, identifier: $identifier) {
            id
            displayName
            dataType
            descriptiveText
            choiceValues {
              choiceStringValue
              displayName
            }
          }
        }
      `;

      try {
        const data = await executeGraphQL<{
          choiceList: {
            id: string;
            displayName: string;
            dataType: string;
            descriptiveText: string;
            choiceValues: Array<{ choiceStringValue: string; displayName: string }>;
          };
        }>(QUERY, { repositoryIdentifier: repositoryId, identifier });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(data.choiceList, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to get choice list: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
