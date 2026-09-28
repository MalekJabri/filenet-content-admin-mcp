import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { executeGraphQL } from "../client.js";

// admCreateClassDefinition response returns: className, id, symbolicName, displayName
const CREATE_CLASS_DEFINITION = `
  mutation CreateClassDefinition(
    $repositoryIdentifier: String!
    $superclassIdentifier: String!
    $symbolicName: String!
    $displayName: String!
    $descriptiveText: String
    $propertyDefinitions: [PropertyDefinitionInput!]!
  ) {
    admCreateClassDefinition(
      repositoryIdentifier: $repositoryIdentifier
      superclassIdentifier: $superclassIdentifier
      classDefinitionProperties: {
        symbolicName: $symbolicName
        displayNames: {
          replace: [{ localeName: "en-us", localizedText: $displayName }]
        }
        descriptiveTexts: {
          replace: [{ localeName: "en-us", localizedText: $descriptiveText }]
        }
        propertyDefinitions: { modify: $propertyDefinitions }
      }
    ) {
      className
      id
      symbolicName
      displayName
    }
  }
`;

// Retrieve full class definition with its property definitions using inline fragments
const GET_CLASS_DEFINITION = `
  query GetClassDefinition($repositoryIdentifier: String!, $identifier: String!) {
    admClassDefinition(
      repositoryIdentifier: $repositoryIdentifier
      identifier: $identifier
    ) {
      id
      symbolicName
      descriptiveText
      displayNames {
        localeName
        localizedText
      }
      allowsInstances
      allowsSubclasses
      propertyDefinitions {
        dataType
        symbolicName
        isValueRequired
        isHidden
        ... on PropertyDefinitionBoolean {
          propertyDefaultBoolean
        }
        ... on PropertyDefinitionDateTime {
          isDateOnly
          propertyDefaultDateTime
        }
        ... on PropertyDefinitionFloat64 {
          propertyDefaultFloat64
        }
        ... on PropertyDefinitionInteger32 {
          propertyDefaultInteger32
        }
        ... on PropertyDefinitionObject {
          allowsForForeignObject
        }
        ... on PropertyDefinitionString {
          maximumLengthString
          propertyDefaultString
        }
      }
    }
  }
`;

const propertyDefinitionSchema = z.object({
  propertyTemplateIdentifier: z
    .string()
    .describe("Symbolic name or GUID of the property template to bind"),
  isValueRequired: z.boolean().default(false),
  isHidden: z.boolean().default(false),
});

/** Flatten repositoryRows properties array into a plain object keyed by label. */
function flattenRow(properties: Array<{ label: string; value: unknown }>): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const p of properties) {
    obj[p.label] = p.value;
  }
  return obj;
}

export function registerDocumentClassTools(server: McpServer): void {
  server.registerTool(
    "create_document_class",
    {
      description:
        "Creates a custom document class definition (subclass of Document or another class) " +
        "in IBM FileNet Content Services. Binds a list of property templates to the class.",
      inputSchema: z.object({
        repositoryId: z
          .string()
          .describe("Repository symbolic identifier (e.g. OS1)"),
        symbolicName: z
          .string()
          .describe("Symbolic name of the new class (e.g. HRDocument)"),
        displayName: z
          .string()
          .describe("Human-readable display name (e.g. 'HR Document')"),
        descriptiveText: z
          .string()
          .optional()
          .describe("Optional description"),
        parentClass: z
          .string()
          .default("Document")
          .describe("Symbolic name of the parent class (default: Document)"),
        propertyDefinitions: z
          .array(propertyDefinitionSchema)
          .default([])
          .describe(
            "Property templates to bind. Each entry references a template by symbolic name or GUID."
          ),
      }),
    },
    async ({ repositoryId, symbolicName, displayName, descriptiveText, parentClass, propertyDefinitions }) => {
      try {
        if (!symbolicName.trim()) {
          return {
            content: [{ type: "text" as const, text: "Error: symbolicName must not be empty" }],
            isError: true,
          };
        }

        const gqlPropertyDefinitions = propertyDefinitions.map((p) => ({
          insertAction: {},
          propertyTemplate: { identifier: p.propertyTemplateIdentifier },
          isValueRequired: p.isValueRequired,
          isHidden: p.isHidden,
        }));

        const data = await executeGraphQL<{
          admCreateClassDefinition: {
            className: string;
            id: string;
            symbolicName: string;
            displayName: string;
          };
        }>(CREATE_CLASS_DEFINITION, {
          repositoryIdentifier: repositoryId,
          superclassIdentifier: parentClass,
          symbolicName,
          displayName,
          descriptiveText: descriptiveText ?? displayName,
          propertyDefinitions: gqlPropertyDefinitions,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(data.admCreateClassDefinition, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to create document class: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "list_document_classes",
    {
      description:
        "Lists immediate subclasses of a given parent class (default: Document) in a FileNet repository. " +
        "Returns each subclass name, symbolic name, and its property descriptions.",
      inputSchema: z.object({
        repositoryId: z
          .string()
          .describe("Repository symbolic identifier (e.g. OS1)"),
        parentClass: z
          .string()
          .default("Document")
          .describe("Parent class to list subclasses of (default: Document)"),
      }),
    },
    async ({ repositoryId, parentClass }) => {
      const QUERY = `
        query ListSubClasses($repositoryIdentifier: String!, $identifier: String!) {
          subClassDescriptions(
            repositoryIdentifier: $repositoryIdentifier
            identifier: $identifier
          ) {
            classDescriptions {
              displayName
              symbolicName
              propertyDescriptions {
                displayName
                symbolicName
                id
                choiceList {
                  name
                  id
                }
              }
            }
          }
        }
      `;

      try {
        const data = await executeGraphQL<{
          subClassDescriptions: {
            classDescriptions: Array<{
              displayName: string;
              symbolicName: string;
              propertyDescriptions: Array<{
                displayName: string;
                symbolicName: string;
                id: string;
                choiceList: { name: string; id: string } | null;
              }>;
            }>;
          };
        }>(QUERY, { repositoryIdentifier: repositoryId, identifier: parentClass });

        const classes = data.subClassDescriptions?.classDescriptions ?? [];
        return {
          content: [{ type: "text" as const, text: JSON.stringify(classes, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to list document classes: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "get_document_class",
    {
      description:
        "Returns a document class definition with all its property definitions " +
        "and data-type-specific fields, looked up by symbolic name or GUID.",
      inputSchema: z.object({
        repositoryId: z
          .string()
          .describe("Repository symbolic identifier (e.g. OS1)"),
        identifier: z
          .string()
          .describe("The class symbolic name or GUID to look up"),
      }),
    },
    async ({ repositoryId, identifier }) => {
      try {
        const data = await executeGraphQL<{
          admClassDefinition: unknown;
        }>(GET_CLASS_DEFINITION, {
          repositoryIdentifier: repositoryId,
          identifier,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(data.admClassDefinition, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to get document class: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
