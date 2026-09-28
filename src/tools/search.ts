import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { executeGraphQL } from "../client.js";

/**
 * Builds the CE SQL `options` string for a COUNT_LIMIT query.
 * The value is appended as-is; Content Engine supports combining options with
 * spaces, e.g. "COUNT_LIMIT 5000 CACHE_VERSION".
 */
function buildCountLimitOption(countLimit: number): string {
  return `COUNT_LIMIT ${countLimit}`;
}

/**
 * pageInfo.totalCount semantics (CE COUNT_LIMIT):
 *   ≥ 0  → exact match count (all items counted within the limit)
 *   < 0  → the limit was reached before counting finished;
 *           the repository has MORE than |totalCount| matching objects.
 */
function interpretTotalCount(totalCount: number | null): string {
  if (totalCount === null) {
    return "COUNT_LIMIT option was not applied — totalCount is unavailable. Pass a countLimit > 0 to enable counting.";
  }
  if (totalCount < 0) {
    return (
      `COUNT_LIMIT reached. There are MORE than ${Math.abs(totalCount)} matching objects. ` +
      `Increase countLimit to get a precise count.`
    );
  }
  return `Exact match count: ${totalCount}`;
}

// ---------------------------------------------------------------------------
// GraphQL query – uses pageSize:0 so only pageInfo is returned (no data rows).
// The `options` variable carries the "COUNT_LIMIT <n>" directive.
// ---------------------------------------------------------------------------
const COUNT_OBJECTS_QUERY = `
  query CountObjects(
    $repositoryIdentifier: String!
    $from: String!
    $where: String
    $options: String
  ) {
    documents(
      repositoryIdentifier: $repositoryIdentifier
      from: $from
      where: $where
      options: $options
      pageSize: 0
    ) {
      pageInfo {
        totalCount
      }
    }
  }
`;

export function registerSearchTools(server: McpServer): void {
  server.registerTool(
    "count_objects",
    {
      description:
        "Counts the number of objects (documents, folders, or any CE class) in a FileNet " +
        "repository that match a given SQL WHERE clause. Uses the Content Engine COUNT_LIMIT " +
        "option to return pageInfo.totalCount.\n\n" +
        "totalCount semantics:\n" +
        "  • Positive value: exact count of matching objects (all counted within the limit).\n" +
        "  • Negative value: COUNT_LIMIT was reached before all matches were counted — " +
        "    the repository contains MORE than |totalCount| matching objects. " +
        "    Increase countLimit to get a more precise (or exact) number.",
      inputSchema: z.object({
        repositoryId: z
          .string()
          .describe("Repository symbolic identifier (e.g. OS1)"),
        from: z
          .string()
          .default("Document")
          .describe(
            "CE SQL FROM class name to search (e.g. Document, Folder, or a custom class). Default: Document"
          ),
        where: z
          .string()
          .optional()
          .describe(
            "CE SQL WHERE clause without the WHERE keyword " +
            "(e.g. \"[DateCreated] > 20180815T070000Z AND [IsCurrentVersion] = True\"). " +
            "Omit to count all objects of the given class."
          ),
        countLimit: z
          .number()
          .int()
          .positive()
          .default(5000)
          .describe(
            "Maximum number of matching objects to count beyond the current page. " +
            "If the actual match count exceeds this value, totalCount is returned as a " +
            "negative number. Increase this value to raise the ceiling. Default: 5000"
          ),
      }),
    },
    async ({ repositoryId, from, where, countLimit }) => {
      try {
        const options = buildCountLimitOption(countLimit);

        const data = await executeGraphQL<{
          documents: {
            pageInfo: {
              totalCount: number | null;
            };
          };
        }>(COUNT_OBJECTS_QUERY, {
          repositoryIdentifier: repositoryId,
          from,
          where: where ?? null,
          options,
        });

        const totalCount = data.documents?.pageInfo?.totalCount ?? null;
        const interpretation = interpretTotalCount(totalCount);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  repositoryId,
                  from,
                  where: where ?? null,
                  countLimit,
                  totalCount,
                  interpretation,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to count objects: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
