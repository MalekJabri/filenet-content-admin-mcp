# Event Actions — Content Event Webhook REST API

The event action tools use the **IBM FileNet Content Services REST API**, not GraphQL.
The base URL is derived from `FILENET_URL` automatically, or you can override it with `FILENET_BASE_URL`.

## Base path

```
{FILENET_BASE_URL}/api/v1/repositories/{repositoryId}/event-actions
```

---

## Create an event action

**Tool:** `create_event_action`

```http
POST /api/v1/repositories/{repositoryId}/event-actions
Content-Type: application/json
Authorization: Basic <base64(user:password)>

{
  "eventActionName": "OnDocumentCreated",
  "eventActionType": "WEBHOOK",
  "webhookConfiguration": {
    "webhookUrl": "https://my-service.example.com/hooks/filenet",
    "webhookSecret": "my-hmac-secret"
  },
  "subscriptions": [
    {
      "subscriptionName": "DocumentCreationSub",
      "eventClass": "Document",
      "subscriptionType": "CREATION",
      "includeSubclasses": true,
      "isEnabled": true
    }
  ]
}
```

---

## Update an event action

**Tool:** `update_event_action`

```http
PUT /api/v1/repositories/{repositoryId}/event-actions/{eventActionId}
Content-Type: application/json
Authorization: Basic <base64(user:password)>

{
  "webhookConfiguration": {
    "webhookUrl": "https://my-service.example.com/hooks/filenet-v2"
  },
  "subscriptions": [
    {
      "isEnabled": false
    }
  ]
}
```

---

## Retrieve an event action

**Tool:** `get_event_action`

```http
GET /api/v1/repositories/{repositoryId}/event-actions/{eventActionId}
Authorization: Basic <base64(user:password)>
```

---

## Search for event actions

**Tool:** `search_event_actions`

```http
GET /api/v1/repositories/{repositoryId}/event-actions?maxItems=100&skipCount=0&filter=OnDoc
Authorization: Basic <base64(user:password)>
```

---

## Delete an event action

**Tool:** `delete_event_action`

```http
DELETE /api/v1/repositories/{repositoryId}/event-actions/{eventActionId}
Authorization: Basic <base64(user:password)>
```

Returns HTTP 204 No Content on success.

---

## Environment variables

| Variable           | Description |
|--------------------|-------------|
| `FILENET_URL`      | GraphQL endpoint (existing). The REST base URL is auto-derived from this. |
| `FILENET_BASE_URL` | Override the REST base URL (e.g. `https://my-server/content-services`). Optional. |
| `FILENET_USERNAME` | Basic auth username |
| `FILENET_PASSWORD` | Basic auth password |

Reference: https://www.ibm.com/docs/en/content-cortex/5.6.0?topic=development-content-event-webhook-examples
