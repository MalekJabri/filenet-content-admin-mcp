# filenet-content-services-mcp

A custom MCP (Model Context Protocol) server that exposes IBM FileNet Content Services metadata
authoring and security management as callable tools for AI assistants such as IBM Bob.

Enables an AI assistant to **create**, **query**, and **validate** Choice Lists, Property Templates,
Document Class Definitions, and Folder Class Definitions, and to **discover users/groups** and
**apply security permissions (ACLs)** directly against a live FileNet Content Services GraphQL
endpoint — no manual copy/paste required.

---

## Why this project exists

IBM FileNet Content Services exposes a GraphQL API for metadata authoring (`admCreateChoiceList`,
`admCreatePropertyTemplate`, `createClassDefinition`, etc.).  
Writing and running these mutations manually is error-prone and disconnected from the AI workflow.

This MCP server bridges that gap:

```
Bob (AI assistant)
  │
  ├─► Tool call: create_choice_list(name, values)
  ├─► Tool call: create_property_template(name, type, ...)
  ├─► Tool call: create_document_class(name, properties, ...)
  ├─► Tool call: create_folder_class(name, properties, ...)
  ├─► Tool call: search_users(searchPattern, ...)
  ├─► Tool call: search_groups(searchPattern, ...)
  └─► Tool call: update_document_security(identifier, permissions[])
        │
        ▼
  filenet-content-services-mcp
        │  HTTP POST → FileNet CS GraphQL endpoint
        ▼
  IBM FileNet Content Services
        │
        └─► Structured result returned to Bob
```

The server is inspired by the staged GraphQL pattern already established in
[`AIDocumentalist`](https://github.com/your-org/BusinessAutomationModes):

- `graphql/01-choice-lists.graphql`
- `graphql/02-property-templates.graphql`
- `graphql/03-class-definition.graphql`

Those files become the reference mutation templates bundled inside this server.

---

## Project structure

```
filenet-content-services-mcp/
├── src/
│   ├── index.ts                  ← MCP server entry point — registers all tools
│   ├── client.ts                 ← FileNet HTTP client (auth, base URL, error handling)
│   └── tools/
│       ├── choiceList.ts         ← create_choice_list, list_choice_lists, get_choice_list
│       ├── propertyTemplate.ts   ← create_property_template, list_property_templates
│       ├── documentClass.ts      ← create_document_class, list_document_classes, get_document_class
│       ├── folderClass.ts        ← create_folder_class, list_folder_classes
│       └── security.ts           ← get_current_user, get_user, get_group,
│                                    search_users, search_groups, list_realms,
│                                    update_document_security, update_folder_security
├── graphql/
│   ├── mutations/
│   │   ├── createChoiceList.graphql
│   │   ├── createPropertyTemplate.graphql
│   │   ├── createDocumentClass.graphql
│   │   ├── createFolderClass.graphql
│   │   └── updateObjectSecurity.graphql
│   └── queries/
│       ├── listChoiceLists.graphql
│       ├── listPropertyTemplates.graphql
│       ├── listClassDefinitions.graphql
│       └── lookupUsersAndGroups.graphql
├── .env.example                  ← Template for required environment variables
├── package.json
├── tsconfig.json
└── README.md
```

---

## Tools exposed

### Choice Lists

| Tool | Description | Key parameters |
|------|-------------|----------------|
| `create_choice_list` | Creates a new choice list | `repositoryId`, `displayName`, `dataType`, `values[]` |
| `list_choice_lists` | Queries existing choice lists | `repositoryId`, `filter?` |
| `get_choice_list` | Returns a single choice list by id or name | `repositoryId`, `identifier` |

**GraphQL mutation used:** `admCreateChoiceList`

---

### Property Templates

| Tool | Description | Key parameters |
|------|-------------|----------------|
| `create_property_template` | Creates a new property template | `repositoryId`, `symbolicName`, `dataType` (`STRING`, `BOOLEAN`, `DATE`, `OBJECT`, `INTEGER`, `FLOAT`), `cardinality` (`SINGLE`, `LIST`), `choiceListId?`, `isSearchable?`, `defaultValue?` |
| `list_property_templates` | Lists property templates | `repositoryId`, `filter?` |

**GraphQL mutation used:** `admCreatePropertyTemplate`  
Data-type-specific sub-property blocks (`subPropertyTemplateStringProperties`,
`subPropertyTemplateBooleanProperties`, `subPropertyTemplateDateTimeProperties`,
`subPropertyTemplateObjectProperties`) are handled internally based on the `dataType` parameter.

---

### Document Class Definitions

| Tool | Description | Key parameters |
|------|-------------|----------------|
| `create_document_class` | Creates a custom document subclass | `repositoryId`, `symbolicName`, `displayName`, `parentClass` (default: `Document`), `propertyTemplates[]` (list of symbolic names or identifiers) |
| `list_document_classes` | Lists document class definitions | `repositoryId`, `filter?` |
| `get_document_class` | Returns a class definition with its bound properties | `repositoryId`, `identifier` |

**GraphQL mutation used:** `createClassDefinition`

---

### Folder Class Definitions

| Tool | Description | Key parameters |
|------|-------------|----------------|
| `create_folder_class` | Creates a custom folder subclass | `repositoryId`, `symbolicName`, `displayName`, `parentClass` (default: `Folder`), `propertyTemplates[]` |
| `list_folder_classes` | Lists folder class definitions | `repositoryId`, `filter?` |

**GraphQL mutation used:** `createClassDefinition` (with `baseClass: FOLDER`)

---

### Security — User & Group Lookup

| Tool | Description | Key parameters |
|------|-------------|----------------|
| `get_current_user` | Returns the authenticated user's identity | _(none)_ |
| `get_user` | Looks up a single user by id, short name, or DN | `identifier` |
| `get_group` | Looks up a single group by id, short name, or DN | `identifier` |
| `search_users` | Finds users matching a name pattern | `searchPattern`, `searchAttribute` (`SHORT_NAME` · `DISPLAY_NAME` · `DISTINGUISHED_NAME`), `searchType` (`CONTAINS` · `STARTS_WITH` · `ENDS_WITH` · `EXACT`), `realmIdentifier?` |
| `search_groups` | Finds groups matching a name pattern | same as `search_users` |
| `list_realms` | Lists all LDAP realms in the domain | _(none)_ |

**GraphQL queries used:** `secCurrentUser`, `secUser`, `secGroup`, `secUsers`, `secGroups`, `secRealms`

> **Tip — finding the right `granteeName` before setting permissions:**
> The `granteeName` field in an ACL entry must match the user or group's `shortName` as stored in
> FileNet. Use `search_users` or `search_groups` first to confirm the exact value, then pass it to
> `update_document_security` or `update_folder_security`.

---

### Security — ACL Updates

| Tool | Description | Key parameters |
|------|-------------|----------------|
| `update_document_security` | Replaces the full ACL on a document | `repositoryId`, `identifier`, `permissions[]` |
| `update_folder_security` | Replaces the full ACL on a folder | `repositoryId`, `identifier`, `permissions[]` |

**GraphQL mutations used:** `updateDocument`, `updateFolder`

Each `permissions[]` entry has the following shape:

| Field | Type | Notes |
|-------|------|-------|
| `type` | `ACCESS_PERMISSION` \| `LEVEL_PERMISSION` | `ACCESS_PERMISSION` uses a bitmask; `LEVEL_PERMISSION` uses a named level |
| `inheritableDepth` | `OBJECT_ONLY` \| `IMMEDIATE_CHILDREN` \| `ALL_CHILDREN` | Defaults to `OBJECT_ONLY` |
| `accessMask` | `number` | Bitmask of rights (e.g. `998903`). Required when `type` is `ACCESS_PERMISSION` |
| `accessLevel` | `string` | Named level (e.g. `"Full Control"`). Required when `type` is `LEVEL_PERMISSION` |
| `subAccessPermission.accessType` | `ALLOW` \| `DENY` | |
| `subAccessPermission.granteeName` | `string` | Short name of the user or group (e.g. `CEAdmin`, `#AUTHENTICATED-USERS`) |

> **Recommended workflow for applying security:**
>
> 1. Call `search_users` or `search_groups` with the person or group's name to get the exact `shortName`.
> 2. Optionally call `list_realms` to target a specific LDAP realm when users exist across multiple directories.
> 3. Build the `permissions[]` array using the confirmed `shortName` as `granteeName`.
> 4. Call `update_document_security` or `update_folder_security` with the full ACL.

---

## Tasks to build

The following tasks represent the full implementation backlog, ordered by dependency.

### Task 1 — Project scaffolding

- [ ] Initialize Node.js/TypeScript project (`npm init`, `tsconfig.json`)
- [ ] Add MCP SDK dependency (`@modelcontextprotocol/sdk`)
- [ ] Add `dotenv`, `node-fetch` (or `axios`) dependencies
- [ ] Create `src/index.ts` entry point with server bootstrap
- [ ] Wire `.env` loading for `FILENET_URL`, `FILENET_USERNAME`, `FILENET_PASSWORD`, `REPOSITORY_ID`
- [ ] Add `.env.example` template

---

### Task 2 — FileNet HTTP client (`src/client.ts`)

- [ ] Implement `executeGraphQL(query: string, variables?: object)` function
- [ ] Handle Basic Auth using `FILENET_USERNAME` / `FILENET_PASSWORD`
- [ ] Parse and surface GraphQL-level errors (the `errors[]` array in response)
- [ ] Add configurable timeout
- [ ] Port the proven pattern from `graphql/run_graphql.py` in the AIDocumentalist project

---

### Task 3 — GraphQL mutation/query files (`graphql/`)

- [ ] Port `graphql/01-choice-lists.graphql` → `graphql/mutations/createChoiceList.graphql`  
      Parameterize `repositoryIdentifier`, `displayName`, `dataType`, `choiceValues` as variables
- [ ] Port `graphql/02-property-templates.graphql` → `graphql/mutations/createPropertyTemplate.graphql`  
      Parameterize all fields; build dynamic sub-property block selection based on `dataType`
- [ ] Port `graphql/03-class-definition.graphql` → `graphql/mutations/createDocumentClass.graphql`
- [ ] Create `graphql/mutations/createFolderClass.graphql` (mirrors document class with `baseClass: FOLDER`)
- [ ] Create read queries: `listChoiceLists.graphql`, `listPropertyTemplates.graphql`, `listClassDefinitions.graphql`

---

### Task 4 — Choice List tool (`src/tools/choiceList.ts`)

- [ ] Implement `create_choice_list` tool handler
  - Accept `repositoryId`, `displayName`, `dataType`, `values[]` (array of `{ value, displayLabel }`)
  - Build `choiceValues.replace[]` array dynamically
  - Call `admCreateChoiceList` mutation
  - Return `{ id, displayName }` on success
- [ ] Implement `list_choice_lists` tool handler
  - Accept optional `filter` string
  - Call read query and return list
- [ ] Implement `get_choice_list` tool handler
- [ ] Register all three tools in `src/index.ts`

---

### Task 5 — Property Template tool (`src/tools/propertyTemplate.ts`)

- [ ] Implement `create_property_template` tool handler
  - Accept `symbolicName`, `dataType`, `cardinality`, `choiceListId?`, `isSearchable?`, `defaultValue?`
  - Dynamically include the correct sub-property block based on `dataType`
    - `STRING` → `subPropertyTemplateStringProperties`
    - `BOOLEAN` → `subPropertyTemplateBooleanProperties`
    - `DATE` → `subPropertyTemplateDateTimeProperties`
    - `OBJECT` → `subPropertyTemplateObjectProperties`
  - Bind choice list inline via `choiceList { identifier }` when `choiceListId` is provided
  - Call `admCreatePropertyTemplate` mutation
- [ ] Implement `list_property_templates` tool handler
- [ ] Register tools in `src/index.ts`

---

### Task 6 — Document Class tool (`src/tools/documentClass.ts`)

- [ ] Implement `create_document_class` tool handler
  - Accept `symbolicName`, `displayName`, `parentClass` (default `Document`), `propertyTemplates[]`
  - Build property binding array for `createClassDefinition` mutation
  - Return created class identifier and summary
- [ ] Implement `list_document_classes` and `get_document_class` handlers
- [ ] Register tools in `src/index.ts`

---

### Task 7 — Folder Class tool (`src/tools/folderClass.ts`)

- [ ] Implement `create_folder_class` tool handler
  - Mirror document class tool but with `parentClass` defaulting to `Folder` and `baseClass: FOLDER`
- [ ] Implement `list_folder_classes` handler
- [ ] Register tools in `src/index.ts`

---

### Task 8 — Validation and error handling

- [ ] Add pre-flight validation: check required fields before sending mutation
- [ ] Map common FileNet GraphQL errors to human-readable messages
  - Duplicate symbolic name
  - Invalid repository identifier
  - Missing required choice list reference
- [ ] Return clear structured errors to the AI assistant

---

### Task 9 — Bob MCP registration

- [ ] Build the server (`npm run build`)
- [ ] Add server entry to `.bob/mcp.json` in the consuming project:

```json
{
  "mcpServers": {
    "filenet-cs": {
      "command": "node",
      "args": ["/path/to/filenet-content-services-mcp/dist/index.js"],
      "env": {
        "FILENET_URL": "https://your-server/content-services-graphql/graphql",
        "FILENET_USERNAME": "your-user",
        "FILENET_PASSWORD": "your-password",
        "REPOSITORY_ID": "OS2"
      }
    }
  }
}
```

- [ ] Verify all tools appear in Bob's MCP tool list
- [ ] Test each tool via Bob conversation

---

### Task 10 — End-to-end test scenario

Using Bob, run the full `HRDocument` recreation sequence end-to-end as a validation:

1. Call `create_choice_list` for each of the 9 choice lists from `01-choice-lists.graphql`
2. Call `create_property_template` for each HR property from `02-property-templates.graphql`
3. Call `create_document_class` for `HRDocument` binding all templates from `03-class-definition.graphql`
4. Query back the class with `get_document_class` and verify all properties are bound

---

## Key design decisions

| Decision | Rationale |
|----------|-----------|
| TypeScript over Python | MCP SDK is Node-native; type safety helps with complex GraphQL input shapes |
| `.graphql` files as templates | Mutations stay readable and version-controlled, separate from tool logic |
| Dynamic sub-property blocks | `dataType` determines which GraphQL sub-input block is included; avoids one massive mutation for all types |
| No ORM / client library | Direct HTTP POST keeps the server dependency-light and easy to audit |
| Environment variables for credentials | Secrets never hardcoded; compatible with Bob MCP `env` config block |

---

## Related resources

- **AIDocumentalist project** — source of proven GraphQL mutation patterns
  - `graphql/01-choice-lists.graphql`
  - `graphql/02-property-templates.graphql`
  - `graphql/03-class-definition.graphql`
  - `graphql/run_graphql.py`
- **IBM FileNet Content Services GraphQL documentation** — mutation schema reference
- **MCP SDK** — `@modelcontextprotocol/sdk` on npm
