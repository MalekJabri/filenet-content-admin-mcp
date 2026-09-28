# HRDocument GraphQL Recreation Set

This folder contains a staged GraphQL recreation set for the custom [`HRDocument`](../HR_Document_Class_Description.md) class and its custom properties.

## Files

1. [`01-choice-lists.graphql`](01-choice-lists.graphql)  
   Optional choice lists for business-controlled string fields.

2. [`02-property-templates.graphql`](02-property-templates.graphql)  
   Property template creation mutations for all custom HR properties.

3. [`03-class-definition.graphql`](03-class-definition.graphql)  
   Final class creation mutation that binds the custom property templates to the `HRDocument` class.

## Runner

Use [`graphql/run_graphql.py`](graphql/run_graphql.py) to execute any staged GraphQL file.

1. Create either [`graphql/.env`](graphql/.env) or [`.env`](.env).
2. Add these values:
   - `USERNAME=...`
   - `PASSWORD=...`
   - `SERVER_URL=...`
3. Run one stage at a time:
   - `python graphql/run_graphql.py graphql/01-choice-lists.graphql`
   - `python graphql/run_graphql.py graphql/02-property-templates.graphql`
   - `python graphql/run_graphql.py graphql/03-class-definition.graphql`

The runner reads credentials from the ignored dotenv file and sends each `mutation` block in sequence to the GraphQL endpoint.

## Execution order

Run the files in this exact order:

1. [`01-choice-lists.graphql`](01-choice-lists.graphql)
2. [`02-property-templates.graphql`](02-property-templates.graphql)
3. [`03-class-definition.graphql`](03-class-definition.graphql)

## Scope included

Included from [`HR_Document_Class_Description.md`](../HR_Document_Class_Description.md):

- Custom class:
  - `HRDocument`
- Custom property groups:
  - Employee Information
  - Employment Details
  - Organizational Structure
  - Dates
  - SAP integration
  - Salesforce integration
  - DocuFlow integration
  - Document Classification
  - AI Properties

Not included:

- Inherited base `Document` system properties
- Tenant-specific security policies
- Lifecycle policies
- Storage policies
- Records management configuration beyond inherited base behavior
- ACLs, markings, subscriptions, and workflow wiring

## Required replacements before execution

Search and replace these placeholders before running the GraphQL:

- `REPOSITORY_ID` or any tenant-specific repository identifier already substituted in the files
- `CHOICE_LIST_ID_*` placeholders in [`graphql/02-property-templates.graphql`](graphql/02-property-templates.graphql)
- Any mutation name or input field that differs in your tenant GraphQL schema

## Important assumptions

The scripts are intentionally based on the metadata authoring example style and may require small schema adjustments because GraphQL metadata authoring capabilities can vary by deployment.

Assumptions used in the files:

- [`admCreateChoiceList`](graphql/01-choice-lists.graphql) exists in the tenant schema
- [`admCreatePropertyTemplate`](graphql/02-property-templates.graphql) exists in the tenant schema
- `createClassDefinition` exists in the tenant schema
- `STRING`, `BOOLEAN`, `OBJECT`, and `DATE` are valid enum values
- `SINGLE` is the correct single-cardinality enum value
- Type-specific settings are provided through subtype blocks such as `subPropertyTemplateStringProperties`, `subPropertyTemplateBooleanProperties`, `subPropertyTemplateDateTimeProperties`, and `subPropertyTemplateObjectProperties`
- String property templates can bind a choice list inline through `choiceList { identifier: "..." }`
- `parentClassIdentifier: "Document"` is accepted for a custom document subclass

## Property mapping notes

### Date properties
The source description labels these as `DATE`:

- `Birthdate`
- `StartDate`
- `TerminationDate`
- `docuflowTimestamp`
- `GenaiDateIndexed`

The scripts model them using `DATE`, with `subPropertyTemplateDateTimeProperties` used for date-only handling where appropriate.

### Object property
`SfSalesforceRelationships` is modeled as:

- `dataType: OBJECT`
- `allowsForeignObject: true`
- `isSearchable: false`

This matches the source description that marks it as object-valued and non-searchable.

### Boolean properties
The following are modeled with subtype boolean settings and defaults of `false`:

- `SapLinkTrigger`
- `SFLinkTrigger`

Remove the default if your tenant does not permit it in [`admCreatePropertyTemplate`](graphql/02-property-templates.graphql).

## Choice list notes

Choice lists are included for business-controlled fields. They now use the tenant-style [`admCreateChoiceList`](graphql/01-choice-lists.graphql) mutation structure supplied by the user, and the related string property templates in [`graphql/02-property-templates.graphql`](graphql/02-property-templates.graphql) bind them inline by `choiceList.identifier`. Some are directly grounded in the source document, while others are suggested seed lists for portability.

Directly grounded in the source:

- `DocType`
- `Department`
- `JobRole`
- `Location`

Suggested starter lists that should be reviewed before production use:

- `JobStatus`
- `EmploymentType`
- `CurrentStatus`
- `DocumentCategory`
- `ClassDocType`

If you do not want strict value control on a field, remove the `choiceList` block from its property template mutation in [`graphql/02-property-templates.graphql`](graphql/02-property-templates.graphql).

## Validation checklist

Before execution:

- Verify the tenant supports metadata authoring mutations
- Verify mutation names and input object names in the GraphQL schema explorer
- Confirm enum names for data type and cardinality
- Confirm whether object property templates are supported in the target tenant
- Replace all `CHOICE_LIST_ID_*` placeholders in [`graphql/02-property-templates.graphql`](graphql/02-property-templates.graphql) with actual created choice list ids
- Confirm whether class-property binding requires additional flags such as order or required-classification metadata

After execution:

- Query the created choice lists
- Query the created property templates
- Query the created `HRDocument` class definition
- Confirm each property is attached to the class
- Confirm searchable flags are set as intended

## Recommended rollout approach

1. Run the choice list script first.
2. Run the property template script.
3. Validate templates created successfully.
4. Run the class definition script.
5. Query back the resulting class and compare it to [`HR_Document_Class_Description.md`](../HR_Document_Class_Description.md).

## Source

Primary source: [`HR_Document_Class_Description.md`](../HR_Document_Class_Description.md)