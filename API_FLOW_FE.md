# API Guide — Login to Construction Flow

> Base URL: `https://<host>/api`. JSON camelCase. All APIs require `Authorization: Bearer <accessToken>` except `api/auth/*` and `api/otp/*`.
> List endpoints accept `pageNumber`, `pageSize` and return `{ items[], pageNumber, pageSize, totalItems, totalPages, hasPrevious, hasNext }`.
> Errors: ProblemDetails `{ status, title, detail }` — 400 invalid input, 401 unauthorized, 404 not found, 409 business rule violation.

`*` = required field.

---

## Flow overview

```
1. Register / Login (auth) → create profile (shop-owner or service-provider-profile)
2. Owner creates Project (project-shop-owners)
3. (optional) Design Brief + AI Recommendation
4. Find provider — path A: post → apply → owner accepts
                 — path B: owner direct-request → provider accepts
   → Engagement (project-working) status = accepted
5. (optional, PRE-contract) Provider creates Survey
6. Contract: create draft → send-otp → owner confirm-otp → confirmed  ← unlocks design & construction
7. If contract type has design:       Designs (submit / approve / revision loop)
8. If contract type has construction: Construction Items (milestones) → Construction Tasks
9. Owner sets engagement status = completed → Review
```

---



## Enums


| Enum                      | Values                                                                             | Used for                                                           |
| ------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Account `role`            | `owner`                                                                            | `provider`                                                         |
| Provider `capability`     | `designer`                                                                         | `constructor`                                                      |
| Provider `providerType`   | `individual`                                                                       | `company`                                                          |
| Post `serviceKind`        | `design`                                                                           | `construction`                                                     |
| Post `status`             | `open`                                                                             | `closed`                                                           |
| Apply `status`            | `pending`                                                                          | `accepted`                                                         |
| Engagement `status`       | `requested` → `accepted`                                                           | `rejected`; `accepted` → `completed`                               |
| Engagement `contractType` | `design`                                                                           | `construction`                                                     |
| Contract `status`         | `drafted` → `pending_otp` → `confirmed`; `cancelled` (only before confirmed)       | OTP signing gate; `confirmed` unlocks designs & construction items |
| Design `status`           | `in_progress` → `submitted` → `approved`; `submitted` → `revision` → `in_progress` | Design review loop                                                 |
| Design `type`             | `concept`                                                                          | `layout_2d`                                                        |
| Item/Task `status`        | `pending` → `in_progress` → `completed`                                            | Construction milestone & task progress (sequential only)           |
| AI `state`                | `queued`                                                                           | `processing`                                                       |


---



## 1. Auth — `api/auth` (public)


| API                          | Input                                      | Output                                                                 |
| ---------------------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| `POST /auth/register`        | `{ email*, password* (≥8), phone, role* }` | `AuthResponse`                                                         |
| `POST /auth/login`           | `{ email*, password* }`                    | `AuthResponse`                                                         |
| `POST /auth/refresh`         | `{ refreshToken* }`                        | new `AuthResponse` (old refresh token revoked — store both new tokens) |
| `POST /auth/logout` (token)  | `{ refreshToken* }`                        | `204`                                                                  |
| `POST /auth/forgot-password` | `{ email* }`                               | `{ message }` — sends OTP to email                                     |
| `POST /auth/reset-password`  | `{ email*, code*, newPassword* (≥8) }`     | `{ message }` — revokes all refresh tokens                             |


`AuthResponse`: `{ accessToken, refreshToken, accountId, email, role }` — access token expires in 15 min, refresh in 7 days.

After register, create the profile: owner → `POST /shop-owners`, provider → `POST /service-provider-profiles` (section 9).

---



## 2. Project — `api/project-shop-owners`


| API                                 | Input                                                                          | Output                     |
| ----------------------------------- | ------------------------------------------------------------------------------ | -------------------------- |
| `POST /project-shop-owners`         | `{ ownerId* (shop_owner id, NOT accountId), name*, address*, areaM2, budget }` | `ProjectShopOwnerResponse` |
| `GET /project-shop-owners?ownerId=` | paging                                                                         | paginated list             |
| `GET /project-shop-owners/{id}`     | —                                                                              | `ProjectShopOwnerResponse` |
| `PUT /project-shop-owners/{id}`     | `{ name, address, areaM2, budget, status }`                                    | `ProjectShopOwnerResponse` |
| `DELETE /project-shop-owners/{id}`  | —                                                                              | `204`                      |


`ProjectShopOwnerResponse`: `{ id, ownerId, name, address, areaM2, budget, status, createdAt, updatedAt, providers[] (engagements: { projectWorkingId, serviceProviderProfileId, displayName, providerType, capability, isVerified, avgRating, contractType, status }), owner { id, fullName, shopName, phone }, openPosts[] ({ id, serviceKind, title, status, submissionDeadline }), openFor[] (service kinds still hiring) }`

---



## 3. Find provider

Both paths end with an **engagement** (`project-working`) with `status = "accepted"`.

### Path A — Owner posts, provider applies


| API                                                           | Input                                                                                                                                                                                                 | Output                                                                    |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `POST /posts`                                                 | `{ projectShopOwnerId*, serviceKind*, title* (≤200), description*, submissionDeadline (future) }`                                                                                                     | `PostResponse` (status=open)                                              |
| `GET /posts?projectShopOwnerId=&serviceKind=&status=&search=` | paging; search by title                                                                                                                                                                               | paginated `PostResponse`                                                  |
| `GET /posts/{id}` / `PUT /posts/{id}` / `DELETE /posts/{id}`  | update: `{ title, description, serviceKind, status, submissionDeadline }`                                                                                                                             | `PostResponse` / `204`                                                    |
| `POST /applies/apply`                                         | `{ postId*, proposal*, estimatedDurationDays (≥1) }` — provider profile taken from JWT, do NOT send serviceProviderProfileId; capability must match post serviceKind; post must be open & not expired | `ApplyResponse` (status=pending)                                          |
| `GET /applies?postId=&serviceProviderProfileId=&status=`      | paging                                                                                                                                                                                                | paginated `ApplyResponse`                                                 |
| `PUT /applies/{id}/proposal`                                  | `{ proposal, estimatedDurationDays }` — only while pending                                                                                                                                            | `ApplyResponse`                                                           |
| `POST /applies/{id}/accept`                                   | (owner, no body)                                                                                                                                                                                      | `ProjectWorkingResponse` — the newly created engagement (status=accepted) |
| `POST /applies/{id}/reject`                                   | (owner, no body)                                                                                                                                                                                      | `ApplyResponse` (rejected)                                                |
| `DELETE /applies/{id}/withdraw`                               | (provider, only while pending)                                                                                                                                                                        | `204` (hard delete)                                                       |


`PostResponse`: `{ id, projectShopOwnerId, projectName, projectAddress, projectBudget, projectAreaM2, serviceKind, title, description, status, submissionDeadline, createdAt, updatedAt }`
`ApplyResponse`: `{ id, postId, postTitle, projectShopOwnerId, serviceProviderProfileId, providerDisplayName, proposal, estimatedDurationDays, status, submittedAt, createdAt, updatedAt }`

### Path B — Owner hires directly


| API                                                              | Input                                                                                                                             | Output                                      |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `GET /service-provider-profiles?capability=&isVerified=&search=` | search providers; capability filter includes `both`; sorted by rating desc                                                        | paginated `ServiceProviderProfileResponse`  |
| `POST /project-workings/direct-request`                          | `{ projectShopOwnerId*, serviceProviderProfileId*, contractType*, requestMessage }` — contractType must match provider capability | `ProjectWorkingResponse` (status=requested) |
| `POST /project-workings/{id}/accept`                             | (provider, no body)                                                                                                               | `ProjectWorkingResponse` (accepted)         |
| `POST /project-workings/{id}/reject`                             | (provider, no body)                                                                                                               | `ProjectWorkingResponse` (rejected)         |




### Engagement — `api/project-workings`


| API                                                                           | Input                                                                                       | Output                             |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------- |
| `GET /project-workings?projectShopOwnerId=&serviceProviderProfileId=&status=` | paging                                                                                      | paginated `ProjectWorkingResponse` |
| `GET /project-workings/{id}`                                                  | —                                                                                           | `ProjectWorkingResponse`           |
| `GET /project-workings/{id}/brief`                                            | provider views owner's brief (open from `requested`; blocked if rejected/terminated)        | `DesignBriefResponse`              |
| `GET /project-workings/{id}/overview`                                         | project overview after AI step                                                              | `EngagementOverviewResponse`       |
| `PUT /project-workings/{id}/status`                                           | `{ status* }` — `completed` (owner acceptance, requires confirmed contract) or `terminated` | `ProjectWorkingResponse`           |


`ProjectWorkingResponse`: `{ id, projectShopOwnerId, projectName, serviceProviderProfileId, providerDisplayName, applyId (null if direct hire), contractType, status, requestMessage, startedAt, createdAt, updatedAt }`
`EngagementOverviewResponse`: `{ projectWorkingId, contractType, status, projectShopOwner { id, name, address, areaM2, budget, status }, brief (design engagements), aiRecommendations[] (state=completed, design engagements), approvedDesigns[] (construction-only engagements) }`

---



## 4. Survey — `api/surveys` (PRE-contract)

Requires engagement `accepted` + contractType has design. Does **NOT** require a confirmed contract.


| API                                                    | Input                                                                                         | Output           |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ---------------- |
| `POST /surveys`                                        | `{ projectWorkingId*, conditionNote*, reportUrl (upload via /files), createdBy (accountId) }` | `SurveyResponse` |
| `GET /surveys?projectWorkingId=` / `GET /surveys/{id}` | paging                                                                                        | `SurveyResponse` |
| `PUT /surveys/{id}`                                    | `{ conditionNote, reportUrl }`                                                                | `SurveyResponse` |


`SurveyResponse`: `{ id, projectWorkingId, version (auto +0.1 per engagement), conditionNote, reportUrl, createdBy, createdAt, updatedAt }`

---



## 5. Contract — `api/contracts` (OTP gate)

Engagement must be `accepted`. `confirmed` unlocks designs & construction items.


| API                                                        | Input                                                                                  | Output                                   |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------- |
| `POST /contracts`                                          | `{ projectWorkingId*, title*, partyInfo, terms, agreedValue, documentUrl }` (provider) | `ContractResponse` (drafted)             |
| `PUT /contracts/{id}`                                      | same fields, optional — only while drafted                                             | `ContractResponse`                       |
| `POST /contracts/{id}/send-otp`                            | no body — OTP emailed to owner; drafted → pending_otp                                  | `ContractResponse` (with `otpExpiresAt`) |
| `POST /contracts/{id}/confirm-otp`                         | `{ otpCode*, confirmedBy* (owner accountId) }` — pending_otp → confirmed               | `ContractResponse` (confirmed)           |
| `POST /contracts/{id}/cancel`                              | no body — only before confirmed                                                        | `ContractResponse` (cancelled)           |
| `GET /contracts?projectWorkingId=` / `GET /contracts/{id}` | paging                                                                                 | `ContractResponse`                       |


`ContractResponse`: `{ id, projectWorkingId, title, partyInfo, terms, agreedValue, documentUrl, otpExpiresAt, confirmedAt, confirmedBy, status, createdAt, updatedAt }`

---



## 6. Design — `api/designs` (contractType = design | both)

Create requires: engagement `accepted` + contract `confirmed`.
Loop: provider creates (`in_progress`, v0.1) → uploads files → `submit` → owner `approve` **or** `request-revision` → provider `start-revision` (version +0.1) → repeat.


| API                                                                  | Input                                                                                                | Output                                       |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `POST /designs`                                                      | `{ projectWorkingId*, title, type*, createdBy }`                                                     | `DesignResponse` (in_progress, v0.1)         |
| `PUT /designs/{id}`                                                  | `{ title, type }` — only in_progress/revision                                                        | `DesignResponse`                             |
| `POST /designs/{id}/submit`                                          | no body — needs ≥1 file (provider)                                                                   | `DesignResponse` (submitted)                 |
| `POST /designs/{id}/approve`                                         | no body (owner)                                                                                      | `DesignResponse` (approved)                  |
| `POST /designs/{id}/request-revision`                                | `{ reason* }` (owner)                                                                                | `DesignResponse` (revision)                  |
| `POST /designs/{id}/start-revision`                                  | no body (provider)                                                                                   | `DesignResponse` (in_progress, version +0.1) |
| `POST /designs/{id}/files`                                           | **multipart form-data**: `file`* (image/pdf/office), `caption`, `uploadedBy` — blocked when approved | `DesignImageResponse`                        |
| `DELETE /designs/{id}/files/{fileId}`                                | blocked when approved                                                                                | `204`                                        |
| `GET /designs?projectWorkingId=&status=&type=` / `GET /designs/{id}` | paging                                                                                               | `DesignResponse` (with `images[]`)           |


`DesignResponse`: `{ id, projectWorkingId, title, version, type, reason (latest revision reason), status, createdBy, createdAt, updatedAt, images[] }`
`DesignImageResponse`: `{ id, designId, imageUrl (GCS objectName), viewUrl (display URL), caption, uploadedBy, createdAt }`

---



## 7. Construction (contractType = construction | both)

Create requires: engagement `accepted` + contract `confirmed`. Two levels: **item = milestone** (can nest via `parentId`), **task = work inside a milestone** (with site photo).

### Milestones — `api/construction-items`


| API                                                                         | Input                                                                                                                    | Output                               |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| `POST /construction-items`                                                  | `{ projectWorkingId*, parentId (parent milestone), name*, description, category, estimateAt ("yyyy-MM-dd"), createdBy }` | `ConstructionItemResponse` (pending) |
| `GET /construction-items?projectWorkingId=&parentId=&status=` / `GET /{id}` | paging                                                                                                                   | `ConstructionItemResponse`           |
| `PUT /construction-items/{id}`                                              | `{ name, description, category, estimateAt }`                                                                            | `ConstructionItemResponse`           |
| `PUT /construction-items/{id}/status`                                       | `{ status* }` — sequential pending → in_progress → completed                                                             | `ConstructionItemResponse`           |
| `DELETE /construction-items/{id}`                                           | —                                                                                                                        | `204`                                |


`ConstructionItemResponse`: `{ id, projectWorkingId, parentId, name, description, category, estimateAt, actualAt (set when completed), status, createdBy, createdAt, updatedAt }`

### Tasks — `api/construction-tasks`


| API                                                                 | Input                                                                                                         | Output                               |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `POST /construction-tasks`                                          | `{ constructionItemId*, name*, description, imageUrl (site photo via /files/images), estimateAt, createdBy }` | `ConstructionTaskResponse` (pending) |
| `GET /construction-tasks?constructionItemId=&status=` / `GET /{id}` | paging                                                                                                        | `ConstructionTaskResponse`           |
| `PUT /construction-tasks/{id}`                                      | `{ name, description, imageUrl, estimateAt, reason }`                                                         | `ConstructionTaskResponse`           |
| `PUT /construction-tasks/{id}/status`                               | `{ status* }`                                                                                                 | `ConstructionTaskResponse`           |
| `DELETE /construction-tasks/{id}`                                   | —                                                                                                             | `204`                                |


`ConstructionTaskResponse`: `{ id, constructionItemId, name, description, imageUrl, estimateAt, actualAt, reason (delay note), status, createdBy, createdAt, updatedAt }`

---



## 8. Finish — acceptance & review


| API                                                                                 | Input                                                                                                                    | Output                                                                                           |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `PUT /project-workings/{id}/status`                                                 | `{ "status": "completed" }` (owner; requires confirmed contract) — unlocks review                                        | `ProjectWorkingResponse`                                                                         |
| `POST /reviews`                                                                     | `{ projectWorkingId* (must be completed), overallRating* (1–5), comment, scores[]: { dimension* (≤50), score* (1–5) } }` | `ReviewResponse`                                                                                 |
| `GET /reviews` / `GET /reviews/{id}` / `PUT /reviews/{id}` / `DELETE /reviews/{id}` | update: same fields optional                                                                                             | `ReviewResponse` / `204`                                                                         |
| `GET /reviews/providers/{serviceProviderProfileId}/summary`                         | —                                                                                                                        | `{ serviceProviderProfileId, reviewCount, averageRating, dimensionAverages { "quality": 4.8 } }` |


`ReviewResponse`: `{ id, projectWorkingId, projectShopOwnerId, serviceProviderProfileId, overallRating, comment, scores[] ({ id, dimension, score }), createdAt, updatedAt }`

---



## 9. Supporting APIs (outside the main flow)



### Acco (paged) / `GET /{id}` / `POST { email*, password* (≥8), phone, role*, status }` / `PUT /{id} { phone, role, status }` / `DELETE /{id}`.

`AccountResponse`: `{ id, email, phone, role, status, emailVerifiedAt, createdAt, updatedAt }`

### Shop Owners — `api/shop-owners` (owner profile, create after register)unts — `api/accounts` (admin)

CRUD: `GET`

CRUD: `POST { accountId*, fullName*, shopName*, phone*, address* }` / `PUT /{id}` (same, optional) / `GET` / `GET /{id}` / `DELETE /{id}`.
`ShopOwnerResponse`: `{ id, accountId, fullName, shopName, phone, address, createdAt, updatedAt }`

### Service Provider Profiles — `api/service-provider-profiles` (provider profile)

CRUD: `POST { accountId*, displayName*, providerType*, capability*, bio, companyTaxCode, yearsExperience, portfolioHeadline }` / `PUT /{id}` (same optional + `isVerified`) / `GET` (filters in section 3B) / `GET /{id}` / `DELETE /{id}`.
`ServiceProviderProfileResponse`: `{ id, accountId, displayName, providerType, capability, bio, companyTaxCode, yearsExperience, portfolioHeadline, isVerified, avgRating, createdAt, updatedAt }`

### Design Briefs — `api/design-briefs` (owner's requirements — input for AI & providers)

CRUD: `POST { projectShopOwnerId*, targetCustomer*, style*, mood*, seatCount, timeline, brandNote, businessModel, businessGoals, operationNote }` / `PUT /{id}` (same optional) / `GET ?projectShopOwnerId=` / `GET /{id}` / `DELETE /{id}`.
`DesignBriefResponse` = same fields + `{ id, createdAt, updatedAt }`

### AI Recommendations — `api/ai-recommendations` (async AI concept generation)

- `POST` `{ briefId*, mustHaveZones[] (≤20), niceToHaveZones[] (≤20), notes (≤2000), generateImage (default false), imageView, detailLevel, alternativesCount (1–3), referenceImageUrls[] (≤8) }` → job queued.
- `GET ?briefId=` (paged) / `GET /{id}` → **poll until** `state` **=** `completed` (or show `lastError` on `failed`).
`AiRecommendationResponse` (short): `{ id, briefId, conceptSummary, payload, state, jobId, lastError, planConceptName, planSummary, layoutWidth/Height/Unit, layoutZones[], layoutAdjacencyRules[], fitoutMin/MaxVnd, equipmentMin/MaxVnd, contingencyPercent, costNotes, customerFlow[], recommendations[], riskNotes[], imageArtifactUrl, seatCapacityRecommendation, createdAt }`



### Files — `api/files` (generic upload to GCS)

- `POST /files` (multipart: `file*`, any type) / `POST /files/images` (images only) → `{ objectName, url, contentType, sizeBytes }`
- `GET /files/view?objectName=` → file stream (use as image src / download)
- `DELETE /files?objectName=` → `204`
Use the returned `url` for `reportUrl` (survey), `documentUrl` (contract), `imageUrl` (task), etc.



### Issues — `api/issues` (problems during work)

- `POST { projectWorkingId*, constructionItemId, issueTypeId*, cause, reason, solution, issueImage, confirmImage, estimateAt, createdBy }`
- `GET ?projectWorkingId=&constructionItemId=&status=` / `GET /{id}` / `PUT /{id}` (same optional) / `PUT /{id}/status { status* }` / `DELETE /{id}`
`IssueResponse` = same fields + `{ id, issueTypeName, actualAt, status, createdAt, updatedAt }`



### Issue Types — `api/issue-types` (issue catalog)

`GET` (no paging) → `[{ id, code, name }]` / `GET /{id}` / `POST { code* (≤50), name* (≤150) }` / `PUT /{id} { name* }` / `DELETE /{id}`.

### Account OTP — `api/otp` (public — email verification; DIFFERENT from contract-signing OTP)

- `POST /otp/send` `{ email* }` — sends code to email
- `POST /otp/verify` `{ email*, code* }` — verifies code

