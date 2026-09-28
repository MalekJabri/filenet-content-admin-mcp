Metadata authoring examples retrieve property template, class definitions, shape, and define choice lists, property templates, class definitions, property definitions of a class definition.
Retrieving property templates
Example to retrieve property templates, shape several general and data type specific fields:
{
  admPropertyTemplate(
    repositoryIdentifier: "OS1"
    identifier: "{2311C51E-03A4-46F7-B424-FD3D4C2120F0}"
  ) {
    symbolicName
    dataType
    isNameProperty
    isHidden
    owner
    descriptiveText
    ... on PropertyTemplateBoolean {
      propertyDefaultBoolean
    }
    ... on PropertyTemplateDateTime {
      isDateOnly
      propertyMaximumDateTime
      propertyDefaultDateTime
    }
    ... on PropertyTemplateFloat64 {
      propertyDefaultFloat64
      propertyMinimumFloat64
      propertyMaximumFloat64
    }
    ... on PropertyTemplateId {
      propertyDefaultId
    }
    ... on PropertyTemplateObject {
      allowsForeignObject
    }
    ... on PropertyTemplateInteger32 {
      propertyMaximumInteger32
      propertyDefaultInteger32
    }
  }
}

Retrieving class definitions
Example to retrieve a class definition and shape many of the class definition fields:
{
  admClassDefinition(
    repositoryIdentifier: "OS1"
    identifier: "{D508E302-7E74-42F4-A7D7-B985DD333509}"
  ) {
    id
    symbolicName
    descriptiveText
    displayNames {
      id
      localeName
      localizedText
    }
    descriptiveTexts {
      id
      localeName
      localizedText
    }
    allowsInstances
    allowsSubclasses
    allowsPropertyAdditions
    updateSequenceNumber
    defaultInstanceOwnerPrincipal {
      className
      ... on User {
        displayName
      }
      ... on Group {
        displayName
      }
    }
    defaultInstancePermissions {
      ... on Permission {
        className
        granteeName
      }
    }
  }
}

Example to retrieve a class definition along with its property definitions:
{
  admClassDefinition(
    repositoryIdentifier: "OS1"
    identifier: "{D508E302-7E74-42F4-A7D7-B985DD333509}"
  ) {
    id
    symbolicName
    propertyDefinitions {
      dataType
      symbolicName
      ... on PropertyDefinitionBinary {
        maximumLengthBinary
      }
      ... on PropertyDefinitionBoolean {
        propertyDefaultBoolean
      }
      ... on PropertyDefinitionDateTime {
        isDateOnly
        propertyDefaultDateTime
        propertyMaximumDateTime
        propertyMinimumDateTime
      }
      ... on PropertyDefinitionFloat64 {
        propertyDefaultFloat64
        propertyMaximumFloat64
        propertyMinimumFloat64
      }
      ... on PropertyDefinitionId {
        propertyDefaultId
      }
      ... on PropertyDefinitionInteger32 {
        propertyDefaultInteger32
        propertyMaximumInteger32
        propertyMinimumInteger32
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

Defining choice lists
Example to create a choice list and add a couple of choice values including the localized display names of those values:
mutation {
  admCreateChoiceList(
    repositoryIdentifier: "P8ObjectStore"
    choiceListProperties: {
      dataType: STRING, 
      displayName: "GQLTestChoiceList", 
      descriptiveText: "GraphQL Test Choice List", 
      choiceValues: {
        replace: [
          {
            insertAction: {}, 
            choiceType: STRING, 
            choiceStringValue: "ValueOne", 
            displayNames: {
              replace: [
                {
                  localeName: "en-us", 
                  localizedText: "Value One"
                }, 
                {
                  localeName: "fr-fr", 
                  localizedText: "French Value One"
                }
              ]
            }
          }, 
          {
            choiceType: STRING, 
            choiceStringValue: "ValueTwo", 
            displayNames: {
              replace: [
                {
                  localeName: "en-us", 
                  localizedText: "Value Two"
                }, 
                {
                  localeName: "fr-fr", 
                  localizedText: "French Value Two"
                }
              ]
            }
          }
        ]
      }
    }
  ) {
    id
    displayName
  }
}

Defining property templates
Example to create a property template whose type is integer:
mutation {
  admCreatePropertyTemplate(
    repositoryIdentifier:"P8ObjectStore"
    dataType:LONG
    propertyTemplateProperties:{
      cardinality:SINGLE
      displayNames:{
        replace:[
          {
            localeName:"en-us"
            localizedText:"GQL Test Prop Integer32"
          }
        ]
      }
      symbolicName:"GQLTestPropInteger32"
      subPropertyTemplateInteger32Properties:{
        propertyDefaultInteger32: 5
        propertyMinimumInteger32: 1
        propertyMaximumInteger32: 10
      }
    }
  ) {
    id
  }
}

Example to create a property template whose type is "String":
mutation {
  admCreatePropertyTemplate(
    repositoryIdentifier:"P8ObjectStore"
    dataType:STRING
    propertyTemplateProperties:{
      cardinality:SINGLE
      displayNames:{
        replace:[
          {
            localeName:"en-us"
            localizedText:"GQL Test Prop String"
          }
        ]
      }
      symbolicName:"GQLTestPropString"
      choiceList: {
        identifier:"{80EBCE83-0000-C01A-8F53-F97628CF8274}"
      }
      subPropertyTemplateStringProperties:{
        maximumLengthString: 96
        propertyDefaultString: "DefaultValue"
        usesLongColumn:false
      }
    }
  ) {
    id
  }
}

Example to update an existing property template whose type is Binary:
mutation {
  admUpdatePropertyTemplate(
    repositoryIdentifier:"P8ObjectStore"
    identifier:"GQLTestPropBinary"
    propertyTemplateProperties: {
      isHidden:true
      isValueRequired:false
      modificationAccessRequired:2
      settability:READ_WRITE
      subPropertyTemplateBinaryProperties:{
        maximumLengthBinary:100000
      }
    }
  )
  {
    id
    displayName
    ... on PropertyTemplateBinary {
      isReadProtected
      maximumLengthBinary
    }
  }
}

Defining class definitions
Example is a basic mutation to create a class definition:
mutation {
  admCreateClassDefinition(
    repositoryIdentifier:"P8ObjectStore"
    superclassIdentifier:"CustomObject"
    classDefinitionProperties:{
      allowsInstances:true
      displayNames:{
        replace:[
          {
            localeName:"en-us"
            localizedText:"GQL Test Custom Object"
          }
        ]
      }
      isHidden:false
      symbolicName:"GQLTestCustomObject"
      subSubscribableClassDefinitionProperties:{
        
      }
    }
  )
  {
    className
    id
    symbolicName
    displayName
  }
}

This following example is an update mutation with more fields of the class definition being specified including default instance permissions, localized display names and audit definitions. Audit definitions are on a sub-class of ClassDefinition – SubscribableClassDefinition. The fields for setting SubscribableClassDefinition properties are under the subSubscribableClassDefinitionProperties field.
mutation {
  admUpdateClassDefinition(
    repositoryIdentifier:"P8ObjectStore"
    identifier: "GQLTestCustomObject"
    classDefinitionProperties:{
      aliasIds:[
        "{38752dc0-16ba-4b46-86c3-cc6e5781a986}"
        "{350122f2-1398-4d43-94f0-3f8dffc5ff34}"
      ]
      allowsInstances:false
      defaultInstancePermissions:{
        replace:[
          {
            type: ACCESS_PERMISSION
            inheritableDepth: OBJECT_ONLY
            accessMask: 998903
            subAccessPermission: {
              accessType: ALLOW
              granteeName: "P8Admin"
            }
          }
          {
            insertAction: {
              classIdentifier: "AccessPermission"
              newIndex: 0
            }
            inheritableDepth: OBJECT_ONLY
            accessMask: 998903
            subAccessPermission: {
              accessType: ALLOW
              granteeName: "P8Admins"
            }
          }
        ]
      }
      defaultRetentionPeriod:5
      descriptiveTexts:{
        modify: [
          {
            localeName:"en-us"
            localizedText:"This is the GQL Test Custom Object"
          }
          {
            localeName:"fr-fr"
            localizedText:"French This is the GQL Test Custom Object"
          }
        ]
      }
      displayNames:{
        modify:[
          {
            localeName:"fr-fr"
            localizedText:"French GQL Test Custom Object"
          }
        ]
      }
      isHidden:true
      retentionPeriodUnits:MINUTES
      subSubscribableClassDefinitionProperties:{
        auditDefinitions:{
          replace:[
            {
              auditFailure:false
              auditSuccess:true
              displayName:"GQL audit def"
              eventClass:{
                identifier:"{01231877-2806-4B03-AC08-E14AF1A638AC}"
              }
              includeSubclassesRequested:false
              isEnabled:false
              objectStateRecordingLevel:MODIFIED_OBJECT
            }
          ]
        }
      }
    }
  )
  {
    className
    id
    symbolicName
    displayName
  }
}

Defining the Property Definitions of a Class Definition
The following example updates a class definition by modifying an existing property definition and adding two new property definitions:

'''json 
mutation {
  admUpdateClassDefinition(
    repositoryIdentifier:"P8ObjectStore"
    identifier: "GQLTestCustomObject"
    classDefinitionProperties:{
      propertyDefinitions:{
        modify:[
          {
            updateAction:{
              itemReference:{
                identifier:"GQLTestPropBoolean"
              }
            }
            aliasIds:[
              "{78e29f53-62fd-437f-9e40-267f89d86415}"
            ]
            copyToReservation:false
            isHidden:false
            isValueRequired:false

    }
  )
  {
    className
    id
    symbolicName
    displayName
  }
}

The following example shows a property template being created and a property definition that is associated with that template is added to a class definition in the same batch.
mutation {
  admCreatePropertyTemplate(
    repositoryIdentifier:"P8ObjectStore"
    id:"{63c3624c-51a7-470b-93a0-ff7672fefd7d}"
    dataType:STRING
    propertyTemplateProperties:{
      cardinality:SINGLE
      displayNames:{
        replace:[
          {
            localeName:"en-us"
            localizedText:"GQL Test Prop String Two"
          }
        ]
      }
      symbolicName:"GQLTestPropString2"
      choiceList: {
        identifier:"{80EBCE83-0000-C01A-8F53-F97628CF8274}"
      }
      subPropertyTemplateStringProperties:{
        maximumLengthString: 96
        propertyDefaultString: "DefaultValue"
        usesLongColumn:false
      }
    }
  ) {
    id
    symbolicName
  }
  
  admUpdateClassDefinition(
    repositoryIdentifier:"P8ObjectStore"
    identifier:"GQLTestCustomObject"
    classDefinitionProperties:{
      propertyDefinitions:{
        modify:[
          {
            propertyTemplate:{
              identifier:"{63c3624c-51a7-470b-93a0-ff7672fefd7d}"
            }
            copyToReservation:false
            isHidden:true
            isValueRequired:false
            settability:READ_WRITE
            subPropertyDefinitionString: {
              maximumLengthString: 128
              propertyDefaultString: "test_only"
            }
          }
        ]
      }
    }
  )
  {
    id
    symbolicName
  }
}

