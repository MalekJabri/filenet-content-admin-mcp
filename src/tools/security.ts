import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { executeGraphQL } from "../client.js";

const UPDATE_DOCUMENT_SECURITY = `
  mutation UpdateDocumentSecurity(
    $repositoryIdentifier: String!
    $identifier: String!
    $permissions: [AccessPermissionInput!]!
  ) {
    updateDocument(
      repositoryIdentifier: $repositoryIdentifier
      identifier: $identifier
      documentProperties: {
        permissions: {
          replace: $permissions
        }
      }
    ) {
      id
      name
    }
  }
`;

const UPDATE_FOLDER_SECURITY = `
  mutation UpdateFolderSecurity(
    $repositoryIdentifier: String!
    $identifier: String!
    $permissions: [AccessPermissionInput!]!
  ) {
    updateFolder(
      repositoryIdentifier: $repositoryIdentifier
      identifier: $identifier
      folderProperties: {
        permissions: {
          replace: $permissions
        }
      }
    ) {
      id
      name
    }
  }
`;

// ── User / Group lookup queries ───────────────────────────────────────────────

const GET_CURRENT_USER = `
  query GetCurrentUser {
    secCurrentUser {
      id
      shortName
      displayName
      distinguishedName
    }
  }
`;

const GET_USER = `
  query GetUser($identifier: String!) {
    secUser(identifier: $identifier) {
      id
      shortName
      displayName
      distinguishedName
    }
  }
`;

const GET_GROUP = `
  query GetGroup($identifier: String!) {
    secGroup(identifier: $identifier) {
      id
      shortName
      displayName
      distinguishedName
    }
  }
`;

const SEARCH_USERS = `
  query SearchUsers(
    $realmIdentifier: String
    $searchPattern: String!
    $searchType: PrincipalSearchTypeEnum!
    $searchAttribute: PrincipalSearchAttribute!
    $sortType: PrincipalSearchSortTypeEnum
  ) {
    secUsers(
      realmIdentifier: $realmIdentifier
      searchPattern: $searchPattern
      searchType: $searchType
      searchAttribute: $searchAttribute
      sortType: $sortType
    ) {
      users {
        id
        shortName
        displayName
        distinguishedName
      }
    }
  }
`;

const SEARCH_GROUPS = `
  query SearchGroups(
    $realmIdentifier: String
    $searchPattern: String!
    $searchType: PrincipalSearchTypeEnum!
    $searchAttribute: PrincipalSearchAttribute!
    $sortType: PrincipalSearchSortTypeEnum
  ) {
    secGroups(
      realmIdentifier: $realmIdentifier
      searchPattern: $searchPattern
      searchType: $searchType
      searchAttribute: $searchAttribute
      sortType: $sortType
    ) {
      groups {
        id
        shortName
        displayName
        distinguishedName
      }
    }
  }
`;

const LIST_REALMS = `
  query ListRealms {
    secRealms {
      realms {
        id
        shortName
        displayName
      }
    }
  }
`;

// ── Shared types ──────────────────────────────────────────────────────────────

interface SecPrincipal {
  id: string;
  shortName: string;
  displayName: string | null;
  distinguishedName: string | null;
}

const accessPermissionSchema = z.object({
  type: z
    .enum(["ACCESS_PERMISSION", "LEVEL_PERMISSION"])
    .describe("Permission type: ACCESS_PERMISSION (bitmask) or LEVEL_PERMISSION (named level)"),
  inheritableDepth: z
    .enum(["OBJECT_ONLY", "IMMEDIATE_CHILDREN", "ALL_CHILDREN"])
    .default("OBJECT_ONLY")
    .describe(
      "How deep the permission propagates: OBJECT_ONLY, IMMEDIATE_CHILDREN, or ALL_CHILDREN"
    ),
  accessMask: z
    .number()
    .int()
    .optional()
    .describe(
      "Bitmask integer defining the access rights (e.g. 998903). Required when type is ACCESS_PERMISSION."
    ),
  accessLevel: z
    .string()
    .optional()
    .describe(
      "Named access level (e.g. 'Full Control'). Required when type is LEVEL_PERMISSION."
    ),
  subAccessPermission: z.object({
    accessType: z
      .enum(["ALLOW", "DENY"])
      .describe("Whether this entry grants or denies access"),
    granteeName: z
      .string()
      .describe("The user or group name to grant/deny access to (e.g. CEAdmin, #AUTHENTICATED-USERS)"),
  }),
});

export function registerSecurityTools(server: McpServer): void {
  // ── User / Group lookup tools ───────────────────────────────────────────────

  server.registerTool(
    "get_current_user",
    {
      description:
        "Returns the identity of the currently authenticated FileNet user " +
        "(id, shortName, displayName, distinguishedName).",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const data = await executeGraphQL<{ secCurrentUser: SecPrincipal }>(GET_CURRENT_USER);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data.secCurrentUser, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to get current user: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "get_user",
    {
      description:
        "Looks up a single FileNet user by id, short name, or distinguished name.",
      inputSchema: z.object({
        identifier: z
          .string()
          .describe("User id, short name, or distinguished name (e.g. CEAdmin or cn=CEAdmin,dc=ecm,dc=ibm,dc=com)"),
      }),
    },
    async ({ identifier }) => {
      try {
        const data = await executeGraphQL<{ secUser: SecPrincipal }>(GET_USER, { identifier });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data.secUser, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to get user: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "get_group",
    {
      description:
        "Looks up a single FileNet group by id, short name, or distinguished name.",
      inputSchema: z.object({
        identifier: z
          .string()
          .describe("Group id, short name, or distinguished name (e.g. P8Admins or cn=P8Admins,dc=ecm,dc=ibm,dc=com)"),
      }),
    },
    async ({ identifier }) => {
      try {
        const data = await executeGraphQL<{ secGroup: SecPrincipal }>(GET_GROUP, { identifier });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data.secGroup, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to get group: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "search_users",
    {
      description:
        "Searches FileNet users by a pattern against SHORT_NAME, DISPLAY_NAME, or DISTINGUISHED_NAME. " +
        "Use searchType EXACT, STARTS_WITH, ENDS_WITH, or CONTAINS. " +
        "Omit realmIdentifier to search in the realm of the authenticated user.",
      inputSchema: z.object({
        searchPattern: z
          .string()
          .describe("Text to search for (e.g. 'admin')"),
        searchAttribute: z
          .enum(["SHORT_NAME", "DISPLAY_NAME"])
          .default("SHORT_NAME")
          .describe("Which user attribute to match against"),
        searchType: z
          .enum(["EXACT", "PREFIX_MATCH", "SUFFIX_MATCH", "CONTAINS"])
          .default("CONTAINS")
          .describe("Match strategy: EXACT, PREFIX_MATCH (starts with), SUFFIX_MATCH (ends with), CONTAINS"),
        sortType: z
          .enum(["ASCENDING", "DESCENDING", "NONE"])
          .default("ASCENDING")
          .optional()
          .describe("Sort order of results"),
        realmIdentifier: z
          .string()
          .optional()
          .describe("Realm to search in; omit to use the authenticated user's realm"),
      }),
    },
    async ({ searchPattern, searchAttribute, searchType, sortType, realmIdentifier }) => {
      try {
        const data = await executeGraphQL<{ secUsers: { users: SecPrincipal[] } }>(SEARCH_USERS, {
          searchPattern,
          searchAttribute,
          searchType,
          sortType: sortType ?? "ASCENDING",
          realmIdentifier: realmIdentifier ?? null,
        });
        const users = data.secUsers?.users ?? [];
        return {
          content: [{ type: "text" as const, text: JSON.stringify(users, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to search users: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "search_groups",
    {
      description:
        "Searches FileNet groups by a pattern against SHORT_NAME, DISPLAY_NAME, or DISTINGUISHED_NAME. " +
        "Use searchType EXACT, STARTS_WITH, ENDS_WITH, or CONTAINS. " +
        "Omit realmIdentifier to search in the realm of the authenticated user.",
      inputSchema: z.object({
        searchPattern: z
          .string()
          .describe("Text to search for (e.g. 'admin')"),
        searchAttribute: z
          .enum(["SHORT_NAME", "DISPLAY_NAME"])
          .default("SHORT_NAME")
          .describe("Which group attribute to match against"),
        searchType: z
          .enum(["EXACT", "PREFIX_MATCH", "SUFFIX_MATCH", "CONTAINS"])
          .default("CONTAINS")
          .describe("Match strategy: EXACT, PREFIX_MATCH (starts with), SUFFIX_MATCH (ends with), CONTAINS"),
        sortType: z
          .enum(["ASCENDING", "DESCENDING", "NONE"])
          .default("ASCENDING")
          .optional()
          .describe("Sort order of results"),
        realmIdentifier: z
          .string()
          .optional()
          .describe("Realm to search in; omit to use the authenticated user's realm"),
      }),
    },
    async ({ searchPattern, searchAttribute, searchType, sortType, realmIdentifier }) => {
      try {
        const data = await executeGraphQL<{ secGroups: { groups: SecPrincipal[] } }>(SEARCH_GROUPS, {
          searchPattern,
          searchAttribute,
          searchType,
          sortType: sortType ?? "ASCENDING",
          realmIdentifier: realmIdentifier ?? null,
        });
        const groups = data.secGroups?.groups ?? [];
        return {
          content: [{ type: "text" as const, text: JSON.stringify(groups, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to search groups: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "list_realms",
    {
      description:
        "Lists all authentication realms (LDAP directories) configured in the FileNet domain. " +
        "Use the returned shortName as the realmIdentifier when searching users or groups.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const data = await executeGraphQL<{
          secRealms: { realms: Array<{ id: string; shortName: string; displayName: string | null }> };
        }>(LIST_REALMS);
        const realms = data.secRealms?.realms ?? [];
        return {
          content: [{ type: "text" as const, text: JSON.stringify(realms, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to list realms: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  // ── ACL update tools ────────────────────────────────────────────────────────

  server.registerTool(
    "update_document_security",
    {
      description:
        "Replaces the security permissions (ACL) on a document in IBM FileNet Content Services. " +
        "Provide one or more access permission entries; the existing permissions will be fully replaced.",
      inputSchema: z.object({
        repositoryId: z
          .string()
          .describe("Repository symbolic identifier (e.g. OS1)"),
        identifier: z
          .string()
          .describe("Document GUID or identifier (e.g. {A0CC2C69-0000-C618-A0A4-3FA294C1AE56})"),
        permissions: z
          .array(accessPermissionSchema)
          .min(1)
          .describe("List of access permission entries that will replace the current ACL"),
      }),
    },
    async ({ repositoryId, identifier, permissions }) => {
      try {
        const gqlPermissions = buildPermissions(permissions);

        const data = await executeGraphQL<{
          updateDocument: { id: string; name: string };
        }>(UPDATE_DOCUMENT_SECURITY, {
          repositoryIdentifier: repositoryId,
          identifier,
          permissions: gqlPermissions,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(data.updateDocument, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to update document security: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    "update_folder_security",
    {
      description:
        "Replaces the security permissions (ACL) on a folder in IBM FileNet Content Services. " +
        "Provide one or more access permission entries; the existing permissions will be fully replaced.",
      inputSchema: z.object({
        repositoryId: z
          .string()
          .describe("Repository symbolic identifier (e.g. OS1)"),
        identifier: z
          .string()
          .describe("Folder GUID or identifier (e.g. {A0CC2C69-0000-C618-A0A4-3FA294C1AE56})"),
        permissions: z
          .array(accessPermissionSchema)
          .min(1)
          .describe("List of access permission entries that will replace the current ACL"),
      }),
    },
    async ({ repositoryId, identifier, permissions }) => {
      try {
        const gqlPermissions = buildPermissions(permissions);

        const data = await executeGraphQL<{
          updateFolder: { id: string; name: string };
        }>(UPDATE_FOLDER_SECURITY, {
          repositoryIdentifier: repositoryId,
          identifier,
          permissions: gqlPermissions,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(data.updateFolder, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to update folder security: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

type PermissionInput = z.infer<typeof accessPermissionSchema>;

function buildPermissions(permissions: PermissionInput[]): object[] {
  return permissions.map((p) => {
    const entry: Record<string, unknown> = {
      type: p.type,
      inheritableDepth: p.inheritableDepth,
      subAccessPermission: {
        accessType: p.subAccessPermission.accessType,
        granteeName: p.subAccessPermission.granteeName,
      },
    };
    if (p.type === "ACCESS_PERMISSION") {
      entry.accessMask = p.accessMask;
    } else {
      entry.accessLevel = p.accessLevel;
    }
    return entry;
  });
}
