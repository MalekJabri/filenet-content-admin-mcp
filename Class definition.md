List sub document class definition and properites.

{
   subClassDescriptions(
    repositoryIdentifier: "OS1"
    identifier: "Document"
  ){
    classDescriptions{
      displayName
      symbolicName
      propertyDescriptions{
        displayName
        symbolicName
        id
        choiceList{
          name
          id
        }
      }
    }
  }
}

Search for all Propety template : 

{
  repositoryRows(repositoryIdentifier : "OS1" 
  sql : "SELECT [This], [Cardinality], [ClassDescription], [Creator], [DataType], [DateCreated], [DateLastModified], [DescriptiveText], [DisplayName], [Id], [IsHidden], [IsNameProperty], [IsValueRequired], [LastModifier], [ModificationAccessRequired], [Name], [Owner], [PersistenceType], [PropertyDisplayCategory], [RequiresUniqueElements], [Settability], [SymbolicName] FROM [PropertyTemplate] OPTIONS(TIMELIMIT 180,COUNT_LIMIT 1000)"
  pageSize: 100){
    repositoryRows{
      properties{
        label
        value
      }
    }
  }
}


{
  repositoryRows(repositoryIdentifier : "OS1" 
  sql : "SELECT [This], [Cardinality], [ClassDescription], [Creator], [DataType], [DateCreated], [DateLastModified], [DescriptiveText], [DisplayName], [Id], [IsHidden], [IsNameProperty], [IsValueRequired], [LastModifier], [ModificationAccessRequired], [Name], [Owner], [PersistenceType], [PropertyDisplayCategory], [RequiresUniqueElements], [Settability], [SymbolicName] FROM [PropertyTemplate] WHERE [SymbolicName] like '%JSON%' OPTIONS(TIMELIMIT 180,COUNT_LIMIT 1000)"
  pageSize: 100){
    repositoryRows{
      properties{
        label
        value
      }
    }
  }
}


List all the choice lists : 

{
  repositoryRows(repositoryIdentifier : "OS1" 
  sql : "SELECT [This], [ClassDescription], [Creator], [DataType], [DateCreated], [DateLastModified], [DescriptiveText], [DisplayName], [HasHierarchy], [Id], [LastModifier], [Name], [Owner] FROM [ChoiceList] OPTIONS(TIMELIMIT 180,COUNT_LIMIT 1000)"
  pageSize: 100){
    repositoryRows{
      properties{
        label
        value
      }
    }
  }
}

REsponse: 



{
  "data": {
    "repositoryRows": {
      "repositoryRows": [
        {
          "properties": [
            {
              "label": "This",
              "value": {
                "identifier": "{976DED50-6B92-4DD4-BDA3-A61C94FA0407}",
                "repositoryIdentifier": "OS1",
                "classIdentifier": "ChoiceList"
              }
            },
            {
              "label": "Class Description",
              "value": {
                "identifier": "{D32E4F70-AFB2-11D2-8BD6-00E0290F729A}",
                "repositoryIdentifier": "OS1",
                "classIdentifier": "ClassDescription"
              }
            },
            {
              "label": "Creator",
              "value": "cpmanager"
            },
            {
              "label": "Data Type",
              "value": 8
            },
            {
              "label": "Date Created",
              "value": "2026-07-10T16:03:23.708Z"
            },
            {
              "label": "Date Last Modified",
              "value": "2026-07-10T16:03:23.708Z"
            },
            {
              "label": "Descriptive Text",
              "value": "Form Types"
            },
            {
              "label": "Display Name",
              "value": "Form Types"
            },
            {
              "label": "Has Hierarchy",
              "value": false
            },
            {
              "label": "ID",
              "value": "{976DED50-6B92-4DD4-BDA3-A61C94FA0407}"
            },
            {
              "label": "Last Modifier",
              "value": "cpmanager"
            },
            {
              "label": "Name",
              "value": "Form Types"
            },
            {
              "label": "Owner",
              "value": "uid=cpmanager,ou=users,dc=cp,dc=internal"
            }
          ]
        },
        {
          "properties": [
            {
              "label": "This",
              "value": {
                "identifier": "{99B9CE24-57CD-4332-8FE6-E50404D08902}",
                "repositoryIdentifier": "OS1",
                "classIdentifier": "ChoiceList"
              }
            },
            {
              "label": "Class Description",
              "value": {
                "identifier": "{D32E4F70-AFB2-11D2-8BD6-00E0290F729A}",
                "repositoryIdentifier": "OS1",
                "classIdentifier": "ClassDescription"
              }
            },
            {
              "label": "Creator",
              "value": "cpmanager"
            },
            {
              "label": "Data Type",
              "value": 8
            },
            {
              "label": "Date Created",
              "value": "2026-07-10T16:03:19.694Z"
            },
            {
              "label": "Date Last Modified",
              "value": "2026-07-10T16:03:19.694Z"
            },
            {
              "label": "Descriptive Text",
              "value": "Preference Type"
            },
            {
              "label": "Display Name",
              "value": "Preference Type"
            },
            {
              "label": "Has Hierarchy",
              "value": false
            },
            {
              "label": "ID",
              "value": "{99B9CE24-57CD-4332-8FE6-E50404D08902}"
            },
            {
              "label": "Last Modifier",
              "value": "cpmanager"
            },
            {
              "label": "Name",
              "value": "Preference Type"
            },
            {
              "label": "Owner",
              "value": "uid=cpmanager,ou=users,dc=cp,dc=internal"
            }
          ]
        },
        {
          "properties": [
            {
              "label": "This",
              "value": {
                "identifier": "{B05DED8D-0000-C81C-8181-2FD95D83B520}",
                "repositoryIdentifier": "OS1",
                "classIdentifier": "ChoiceList"
              }
            },
            {
              "label": "Class Description",
              "value": {
                "identifier": "{D32E4F70-AFB2-11D2-8BD6-00E0290F729A}",
                "repositoryIdentifier": "OS1",
                "classIdentifier": "ClassDescription"
              }
            },
            {
              "label": "Creator",
              "value": "cpmanager"
            },
            {
              "label": "Data Type",
              "value": 8
            },
            {
              "label": "Date Created",
              "value": "2026-07-10T16:03:52.919Z"
            },
            {
              "label": "Date Last Modified",
              "value": "2026-07-10T16:03:52.919Z"
            },
            {
              "label": "Descriptive Text",
              "value": "Gen AI Index Status Choices"
            },
            {
              "label": "Display Name",
              "value": "Gen AI Index Status Choices"
            },
            {
              "label": "Has Hierarchy",
              "value": false
            },
            {
              "label": "ID",
              "value": "{B05DED8D-0000-C81C-8181-2FD95D83B520}"
            },
            {
              "label": "Last Modifier",
              "value": "cpmanager"
            },
            {
              "label": "Name",
              "value": "Gen AI Index Status Choices"
            },
            {
              "label": "Owner",
              "value": "uid=cpmanager,ou=users,dc=cp,dc=internal"
            }
          ]
        },
        {
          "properties": [
            {
              "label": "This",
              "value": {
                "identifier": "{D1F143B6-C731-43B0-8A1D-85E98B109937}",
                "repositoryIdentifier": "OS1",
                "classIdentifier": "ChoiceList"
              }
            },
            {
              "label": "Class Description",
              "value": {
                "identifier": "{D32E4F70-AFB2-11D2-8BD6-00E0290F729A}",
                "repositoryIdentifier": "OS1",
                "classIdentifier": "ClassDescription"
              }
            },
            {
              "label": "Creator",
              "value": "cpmanager"
            },
            {
              "label": "Data Type",
              "value": 6
            },
            {
              "label": "Date Created",
              "value": "2026-07-10T16:03:44.226Z"
            },
            {
              "label": "Date Last Modified",
              "value": "2026-07-10T16:03:44.226Z"
            },
            {
              "label": "Descriptive Text",
              "value": null
            },
            {
              "label": "Display Name",
              "value": "ClbFollowingChoiceList"
            },
            {
              "label": "Has Hierarchy",
              "value": false
            },
            {
              "label": "ID",
              "value": "{D1F143B6-C731-43B0-8A1D-85E98B109937}"
            },
            {
              "label": "Last Modifier",
              "value": "cpmanager"
            },
            {
              "label": "Name",
              "value": "ClbFollowingChoiceList"
            },
            {
              "label": "Owner",
              "value": "uid=cpmanager,ou=users,dc=cp,dc=internal"
            }
          ]
        },
        {
          "properties": [
            {
              "label": "This",
              "value": {
                "identifier": "{D5B8DB32-4133-424C-998A-209D890C7BD6}",
                "repositoryIdentifier": "OS1",
                "classIdentifier": "ChoiceList"
              }
            },
            {
              "label": "Class Description",
              "value": {
                "identifier": "{D32E4F70-AFB2-11D2-8BD6-00E0290F729A}",
                "repositoryIdentifier": "OS1",
                "classIdentifier": "ClassDescription"
              }
            },
            {
              "label": "Creator",
              "value": "cpmanager"
            },
            {
              "label": "Data Type",
              "value": 8
            },
            {
              "label": "Date Created",
              "value": "2026-07-10T16:03:26.219Z"
            },
            {
              "label": "Date Last Modified",
              "value": "2026-07-10T16:03:26.219Z"
            },
            {
              "label": "Descriptive Text",
              "value": "Entry Choices"
            },
            {
              "label": "Display Name",
              "value": "Entry Choices"
            },
            {
              "label": "Has Hierarchy",
              "value": false
            },
            {
              "label": "ID",
              "value": "{D5B8DB32-4133-424C-998A-209D890C7BD6}"
            },
            {
              "label": "Last Modifier",
              "value": "cpmanager"
            },
            {
              "label": "Name",
              "value": "Entry Choices"
            },
            {
              "label": "Owner",
              "value": "uid=cpmanager,ou=users,dc=cp,dc=internal"
            }
          ]
        }
      ]
    }
  }
}
