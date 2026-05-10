# Product modules (SignFlow / e-sign platform)

Reference breakdown of capability areas. Use this to phase work and align code folders.

**Legend:** **Done** = present in this repo in some form · **Partial** = stub or minimal · **Planned** = not built

| # | Module | Scope (your list) | SignFlow today | Suggested code home |
|---|--------|-------------------|----------------|---------------------|
| 1 | **Authentication & User Management** | Registration/login (email, SSO, OAuth 2.0), JWT sessions, RBAC (Admin, Sender, Signer, Viewer), orgs/teams, MFA, password reset | **Planned** | `src/app/(auth)/`, `src/lib/auth/`, Mongo `users`, `sessions` |
| 2 | **Document Management** | Upload PDF/DOCX/XLSX/PNG, cloud import, preview, multi-doc envelopes, versioning, encrypted storage | **Partial** (PDF only, GridFS/Mongo) | `src/app/api/documents/`, `src/lib/storage/`, converters service later |
| 3 | **Signature & Field Placement** | Draw / typed / image signature, drag-drop fields, resize/move, many field types | **Partial** (draw + date + text, drag on PDF) | `src/components/fields/`, extend `PdfPageWithOverlay` |
| 4 | **Recipient & Workflow** | Multiple recipients, CC, order (seq/parallel), per-recipient fields, in-person, embedded signing, recipient auth | **Partial** (single signer; link-based sign) | `src/lib/workflows/`, envelope schema extensions |
| 5 | **Envelope / Sending** | Send packages, custom email/message, expiry, reminders, resend/void, bulk send | **Partial** (send + share link; no email from app by default) | `src/lib/envelopes/`, job queue for reminders |
| 6 | **Templates** | Reusable templates, roles, org sharing, versioning, doc gen / merge | **Planned** | `src/app/templates/`, Mongo `templates` |
| 7 | **Notifications & Webhooks** | Email/SMS events, in-app realtime, Connect-style webhooks | **Partial** (`src/lib/gmail.ts`, DocuSign Connect stub) | `src/lib/notifications/`, `src/app/api/webhooks/` |
| 8 | **Dashboard & Tracking** | Sender/recipient views, timeline, audit trail, search/filter | **Partial** (basic sender list) | `src/app/dashboard/`, `auditEvents` collection |
| 9 | **Security & Compliance** | TLS, encryption at rest, tamper-evident seal, PKI, audit PDF, GDPR, eIDAS/ESIGN, SOC2 | **Planned** (TLS via hosting; rest TBD) | policies + HSM/KMS integration later |
| 10 | **Signing Experience** | Mobile-friendly, terms gate, decline w/ reason, certificate of completion, download signed PDF | **Partial** (responsive signing; no terms/decline/completion cert) | `src/app/sign/`, completion PDF generator |
| 11 | **Integrations** | REST API, SDKs, CRM, cloud sync, payments, Zapier | **Partial** (REST envelopes + DocuSign bridge) | `src/app/api/integrations/`, OpenAPI spec |
| 12 | **Admin & Billing** | Admin panel, plans, usage, branding, API keys, admin audit | **Planned** | `src/app/admin/`, Stripe, `organizations` |

---

## Detail checklist (copy of your scope)

### 1. Authentication & User Management
- User registration & login (email/password, SSO, OAuth 2.0)
- JWT-based session management
- Role-based access control (Admin, Sender, Signer, Viewer)
- Team/organization management
- Multi-factor authentication (MFA)
- Password reset & account recovery

### 2. Document Management
- Upload documents (PDF, DOCX, XLSX, PNG, etc.)
- Import from cloud storage (Google Drive, OneDrive, Dropbox)
- Document preview in-browser
- Multi-document envelope (bundle multiple docs)
- Document versioning
- Secure document storage with encryption

### 3. Signature & Field Placement
- Draw signature (canvas/mouse/touch)
- Typed signature (font-based)
- Upload image as signature
- Drag-and-drop signature fields on document
- Resizable and movable fields
- Field types: Signature, Initials, Date, Text Box, Checkbox, Dropdown, Radio Button

### 4. Recipient & Workflow Management
- Add multiple recipients (signers, CC, certified delivery)
- Define signing order (sequential or parallel)
- Assign specific fields to specific recipients
- In-person signing mode
- Embedded signing
- Recipient authentication (email, SMS OTP, access code, ID verification)

### 5. Envelope / Sending
- Create and send envelopes (document packages)
- Custom email subject and message per envelope
- Expiration date for signing deadlines
- Reminders / auto-follow-up notifications
- Resend or void envelopes
- Bulk send (same document to multiple recipients)

### 6. Templates
- Create reusable document templates
- Predefined field layouts and signing roles
- Template sharing within an organization
- Template versioning
- Document generation — auto-populate from systems

### 7. Notifications & Webhooks
- Email notifications (sent, viewed, signed, completed, declined, expired)
- Real-time in-app status updates
- Webhook/Connect events
- SMS notifications (optional)

### 8. Dashboard & Tracking
- Sender dashboard (All, Drafts, Waiting, Completed, Voided)
- Recipient inbox
- Envelope status timeline
- Audit trail (view/sign time, IP)
- Search and filter

### 9. Security & Compliance
- TLS in transit, encryption at rest
- Tamper-evident sealing, PKI signatures
- Audit trail / certificate of completion
- GDPR, eIDAS / ESIGN / UETA, SOC 2 / ISO readiness

### 10. Signing Experience
- Clean UI (optional login for recipients)
- Mobile-responsive
- Agree to terms before signing
- Decline with reason
- Certificate of completion PDF
- Download signed document

### 11. Integrations
- REST API, SDKs
- CRM, cloud storage, payments
- Zapier / Make

### 12. Admin & Billing
- Admin panel, subscriptions, usage analytics
- Custom branding
- API key management
- Admin audit logs

---

## Suggested implementation phases (for this codebase)

1. **Foundation:** Auth (NextAuth or custom JWT) + `User` / `Organization` in MongoDB + RBAC middleware.
2. **Core product:** Multi-recipient envelopes, email via Gmail/SMTP, envelope statuses matching dashboard tabs.
3. **Fields & signing:** Typed/image signature, more field types, terms + decline.
4. **Templates & bulk:** Template collection + clone-to-envelope + bulk jobs.
5. **Compliance & polish:** Audit log storage, completion certificate PDF, retention APIs.
6. **Enterprise:** SSO, MFA, PKI integration, formal compliance program (outside code).

---

*Last aligned with repo: SignFlow (Next.js 16, MongoDB, DocuSign bridge, Gmail helper).*
