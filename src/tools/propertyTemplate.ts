import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { executeGraphQL } from "../client.js";

type DataType = "STRING" | "BOOLEAN" | "DATE" | "OBJECT" | "INTEGER" | "FLOAT";

/**
 * Maps user-facing dataType enum values to the GraphQL TypeID enum expected by
 * admCreatePropertyTemplate, and returns the correct sub-property block name.
 * Confirmed against PropertyTemplatePropertiesInput in the live schema.
 */
const DATA_TYPE_CONFIG: Record<DataType, { gqlType: string; subBlock: (allowsForeignObject: boolean) => string }> = {
  STRING:  { gqlType: "STRING",  subBlock: () => "subPropertyTemplateStringProperties: {}" },
  BOOLEAN: { gqlType: "BOOLEAN", subBlock: () => "subPropertyTemplateBooleanProperties: {}" },
  DATE:    { gqlType: "DATE",    subBlock: () => "subPropertyTemplateDateTimeProperties: {}" },
  INTEGER: { gqlType: "LONG",    subBlock: () => "subPropertyTemplateInteger32Properties: {}" },
  FLOAT:   { gqlType: "DOUBLE",  subBlock: () => "subPropertyTemplateFloat64Properties: {}" },
  OBJECT:  { gqlType: "OBJECT",  subBlock: (afo) => `subPropertyTemplateObjectProperties: { allowsForeignObject: ${afo} }` },
};

function buildCreateMutation(dataType: DataType, hasChoiceList: boolean, allowsForeignObject: boolean): string {
  const { gqlType, subBlock } = DATA_TYPE_CONFIG[dataType];
  const choiceListBlock = hasChoiceList ? "choiceList: { identifier: $choiceListIdentifier }" : "";

  return `
    mutation CreatePropertyTemplate(
      $repositoryIdentifier: String!
      $symbolicName: String!
      $displayName: String!
      $cardinality: Cardinality!
      ${hasChoiceList ? "$choiceListIdentifier: String!" : ""}
    ) {
      admCreatePropertyTemplate(
        repositoryIdentifier: $repositoryIdentifier
        dataType: ${gqlType}
        propertyTemplateProperties: {
          symbolicName: $symbolicName
          cardinality: $cardinality
          displayNames: {
            replace: [{ localeName: "en-us", localizedText: $displayName }]
          }
          ${choiceListBlock}
          ${subBlock(allowsForeignObject)}
        }
      ) {
        id
        symbolicName
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

export function registerPropertyTemplateTools(server: McpServer): void {
  server.registerTool(
    "create_property_template",
    {
      description:
        "Creates a new property template in IBM FileNet Content Services. " +
        "The correct sub-property block is selected automatically based on dataType. " +
        "Returns the new template id and symbolicName.",
      inputSchema: z.object({
        repositoryId: z
          .string()
          .describe("Repository symbolic identifier (e.g. OS1)"),
        symbolicName: z
          .string()
          .describe("Symbolic (programmatic) name of the property template (e.g. FirstName)"),
        displayName: z
          .string()
          .describe("Human-readable display name (e.g. 'First Name')"),
        dataType: z
          .enum(["STRING", "BOOLEAN", "DATE", "OBJECT", "INTEGER", "FLOAT"])
          .describe("Property data type"),
        cardinality: z
          .enum(["SINGLE", "LIST"])
          .default("SINGLE")
          .describe("Single-value or multi-value"),
        choiceListId: z
          .string()
          .optional()
          .describe("GUID of an existing choice list to bind to this property"),
        allowsForeignObject: z
          .boolean()
          .default(false)
          .describe("For OBJECT type only: whether foreign objects are allowed"),
      }),
    },
    async ({ repositoryId, symbolicName, displayName, dataType, cardinality, choiceListId, allowsForeignObject }) => {
      try {
        if (!symbolicName.trim()) {
          return {
            content: [{ type: "text" as const, text: "Error: symbolicName must not be empty" }],
            isError: true,
          };
        }

        const mutation = buildCreateMutation(dataType as DataType, !!choiceListId, allowsForeignObject);

        const variables: Record<string, unknown> = {
          repositoryIdentifier: repositoryId,
          symbolicName,
          displayName,
          cardinality,
        };
        if (choiceListId) {
          variables.choiceListIdentifier = choiceListId;
        }

        const data = await executeGraphQL<{
          admCreatePropertyTemplate: { id: string; symbolicName: string };
        }>(mutation, variables);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(data.admCreatePropertyTemplate, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to create property template: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "list_property_templates",
    {
      description:
        "Lists property templates in a FileNet repository using a SQL search. " +
        "Optionally filter by symbolic name (supports SQL LIKE wildcards, e.g. 'HR%').",
      inputSchema: z.object({
        repositoryId: z
          .string()
          .describe("Repository symbolic identifier (e.g. OS1)"),
        filter: z
          .string()
          .optional()
          .describe("Optional symbolic name filter using SQL LIKE syntax (e.g. 'HR%')"),
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
        ? ` WHERE [SymbolicName] LIKE '${filter.replace(/'/g, "''")}'`
        : "";
      const sql = `SELECT [This], [SymbolicName], [DisplayName], [DataType], [Cardinality], [Id], [DateCreated], [DateLastModified], [DescriptiveText] FROM [PropertyTemplate]${whereClause} OPTIONS(TIMELIMIT 180,COUNT_LIMIT 1000)`;

      const QUERY = `
        query ListPropertyTemplates($repositoryIdentifier: String!, $sql: String!, $pageSize: Int) {
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
              text: `Failed to list property templates: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "get_property_template",
    {
      description:
        "Returns detailed information about a property template by its symbolic name or GUID, " +
        "including data-type-specific fields (default value, min/max, etc.).",
      inputSchema: z.object({
        repositoryId: z
          .string()
          .describe("Repository symbolic identifier (e.g. OS1)"),
        identifier: z
          .string()
          .describe("The property template symbolic name or GUID to look up"),
      }),
    },
    async ({ repositoryId, identifier }) => {
      const QUERY = `
        query GetPropertyTemplate($repositoryIdentifier: String!, $identifier: String!) {
          admPropertyTemplate(
            repositoryIdentifier: $repositoryIdentifier
            identifier: $identifier
          ) {
            symbolicName
            dataType
            isHidden
            descriptiveText
            ... on PropertyTemplateBoolean {
              propertyDefaultBoolean
            }
            ... on PropertyTemplateDateTime {
              isDateOnly
              propertyDefaultDateTime
              propertyMaximumDateTime
            }
            ... on PropertyTemplateFloat64 {
              propertyDefaultFloat64
              propertyMinimumFloat64
              propertyMaximumFloat64
            }
            ... on PropertyTemplateInteger32 {
              propertyDefaultInteger32
              propertyMinimumInteger32
              propertyMaximumInteger32
            }
            ... on PropertyTemplateObject {
              allowsForeignObject
            }
            ... on PropertyTemplateString {
              maximumLengthString
              propertyDefaultString
            }
          }
        }
      `;

      try {
        const data = await executeGraphQL<{
          admPropertyTemplate: unknown;
        }>(QUERY, { repositoryIdentifier: repositoryId, identifier });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(data.admPropertyTemplate, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to get property template: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
