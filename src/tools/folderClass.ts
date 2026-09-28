import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { executeGraphQL } from "../client.js";

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

const propertyDefinitionSchema = z.object({
  propertyTemplateIdentifier: z
    .string()
    .describe("Symbolic name or GUID of the property template to bind"),
  isValueRequired: z.boolean().default(false),
  isHidden: z.boolean().default(false),
});

export function registerFolderClassTools(server: McpServer): void {
  server.registerTool(
    "create_folder_class",
    {
      description:
        "Creates a custom folder class definition (subclass of Folder or another class) " +
        "in IBM FileNet Content Services. Binds a list of property templates to the class.",
      inputSchema: z.object({
        repositoryId: z
          .string()
          .describe("Repository symbolic identifier (e.g. OS1)"),
        symbolicName: z
          .string()
          .describe("Symbolic name of the new class (e.g. HRFolder)"),
        displayName: z
          .string()
          .describe("Human-readable display name (e.g. 'HR Folder')"),
        descriptiveText: z
          .string()
          .optional()
          .describe("Optional description"),
        parentClass: z
          .string()
          .default("Folder")
          .describe("Symbolic name of the parent class (default: Folder)"),
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
              text: `Failed to create folder class: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "list_folder_classes",
    {
      description:
        "Lists immediate subclasses of a given parent folder class (default: Folder) in a FileNet repository. " +
        "Returns each subclass name, symbolic name, and its property descriptions.",
      inputSchema: z.object({
        repositoryId: z
          .string()
          .describe("Repository symbolic identifier (e.g. OS1)"),
        parentClass: z
          .string()
          .default("Folder")
          .describe("Parent class to list subclasses of (default: Folder)"),
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
              text: `Failed to list folder classes: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
