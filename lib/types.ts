// Every shape here is checked directly against ecotrack-api's Drizzle schema and
// service return types, not guessed from the SRS/SAD — several of the old types in
// this file (Membership, community_user, nested requester/volunteer objects that
// don't exist, etc.) were built against a pre-rearchitecture backend and no longer
// match anything the API actually returns.

export type UserRole = 'citizen' | 'volunteer' | 'org_admin';

/** The real GET /auth/me shape. No memberships array — a user has at most one
 * organisation, stored directly on their row, not a join table. */
export interface Profile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isPlatformAdmin: boolean;
  notificationPreferences: {
    taskAssigned: boolean;
    scheduleChanged: boolean;
    cleanupScheduled: boolean;
  };
  organisation: { id: string; name: string; isActive: boolean } | null;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** service area fields are flat on Organisation, not nested — matches
 * organisations.serviceAreaCenter / serviceAreaRadiusKm directly. */
export interface Organisation {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description: string | null;
  contactEmail: string;
  isActive: boolean;
  serviceAreaCenter: GeoPoint | null;
  serviceAreaRadiusKm: number | null;
}

/** GET /organisations/:id/members — a flat user row filtered by org/role, not a
 * join-table row (there is no memberships table). */
export interface OrganisationMember {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

/** The email-bound, single-use `invitations` table — still used only for the
 * initialAdminEmail org-bootstrap path (organisations.service.ts), not for
 * volunteer onboarding. See InviteLink for that. */
export interface Invitation {
  id: string;
  createdAt: string;
  updatedAt: string;
  organisationId: string;
  email: string;
  invitedFullName: string | null;
  role: UserRole;
  token: string;
  invitedByUserId: string | null;
  expiresAt: string;
  acceptedAt: string | null;
}

export interface CreateOrganisationResult {
  organisation: Organisation;
  adminInvitation: Invitation | null;
  adminAlreadyExisted: boolean;
}

export interface InvitationInfo {
  email: string;
  invitedFullName: string | null;
  organisationName: string;
  role: UserRole;
  expired: boolean;
  accepted: boolean;
  emailAlreadyRegistered: boolean;
}

/** SRS 3.1.12's shareable, multi-use invite links (invite_links table) — the
 * mechanism volunteers actually use to join, separate from Invitation above.
 * `token` only ever appears in the response to POST .../invites, exactly once;
 * it is never persisted or returned again. */
export interface InviteLink {
  id: string;
  createdAt: string;
  updatedAt: string;
  organisationId: string;
  tokenHash: string;
  maxUses: number | null;
  usesCount: number;
  expiresAt: string;
  createdByUserId: string | null;
  revokedAt: string | null;
}

export interface CreateInviteLinkResult {
  inviteLink: InviteLink;
  token: string;
}

export interface InviteLinkPublicInfo {
  organisationName: string;
  expired: boolean;
  revoked: boolean;
  exhausted: boolean;
}

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

export interface JoinRequest {
  id: string;
  createdAt: string;
  updatedAt: string;
  organisationId: string;
  userId: string;
  requester: { id: string; fullName: string; email: string } | null;
  message: string | null;
  status: JoinRequestStatus;
}

export interface WorkflowStage {
  id: string;
  createdAt: string;
  updatedAt: string;
  organisationId: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  position: number;
  isFinal: boolean;
}

/** SRS 3.1.13's Workflow Stage Rules — one row per org. A null *MinStageId means
 * "no minimum enforced"; a null *TargetStageId means "Automatic" (next stage by
 * position). The event_* fields exist and are settable from day one but have no
 * effect on incidents until an event references them. */
export interface WorkflowStageRules {
  organisationId: string;
  createdAt: string;
  updatedAt: string;
  taskCreationMinStageId: string | null;
  taskCreationTargetStageId: string | null;
  eventCreationMinStageId: string | null;
  eventCreationTargetStageId: string | null;
  taskCompletionTargetStageId: string | null;
  eventCompletionTargetStageId: string | null;
}

/** No 'pending' — pending == pooled, represented by organisationId being null,
 * not a verificationStatus value. */
export type VerificationStatus = 'approved' | 'rejected' | 'duplicate';
export type IncidentCategory =
  | 'illegal_dumping'
  | 'water_pollution'
  | 'air_pollution'
  | 'deforestation'
  | 'wildlife_hazard'
  | 'other';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface IncidentImage {
  id: string;
  url: string;
}

/** GET .../incidents/:id and .../incidents/mine shape (findByIdWithImages). The
 * plain org-scoped list (GET .../incidents) returns this same row shape minus
 * `images` — see IncidentSummary below. `location` decodes to real
 * coordinates now (fromDriver parses the WKB the driver returns), not the WKB
 * hex string earlier API versions returned. */
export interface Incident {
  id: string;
  createdAt: string;
  updatedAt: string;
  /** null while unclaimed in the cross-organisation incident pool. */
  organisationId: string | null;
  reportedByUserId: string | null;
  title: string;
  description: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  location: GeoPoint;
  address: string | null;
  /** null while pooled — set to 'approved' automatically on claim. */
  verificationStatus: VerificationStatus | null;
  currentStageId: string | null;
  rejectionReason: string | null;
  duplicateOfId: string | null;
  claimedByUserId: string | null;
  claimedAt: string | null;
  version: number;
  images: IncidentImage[];
}

/** GET /organisations/:id/incidents — no images join, unlike Incident above. */
export type IncidentSummary = Omit<Incident, 'images'>;

/** GET /incidents/pool — a distinct, flatter shape: ST_Y/ST_X-projected lat/lng
 * plus a computed distanceMeters, not the full Incident row. */
export interface PoolIncident {
  id: string;
  title: string;
  description: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  address: string | null;
  createdAt: string;
  lat: number;
  lng: number;
  distanceMeters: number;
}

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
/** 'cancelled' marks an assignment a reassignment superseded — distinct from
 * 'declined', the volunteer's own refusal (SRS 3.1.8). */
export type AssignmentStatus = 'assigned' | 'accepted' | 'declined' | 'cancelled';

export interface TaskAssignment {
  id: string;
  createdAt: string;
  updatedAt: string;
  taskId: string;
  volunteerUserId: string;
  volunteer: { id: string; fullName: string; email: string } | null;
  status: AssignmentStatus;
  respondedAt: string | null;
  declineReason: string | null;
}

export interface TaskNote {
  id: string;
  createdAt: string;
  taskId: string;
  authorUserId: string | null;
  note: string;
}

export interface TaskPhoto {
  id: string;
  createdAt: string;
  taskId: string;
  url: string;
  uploadedByUserId: string | null;
}

/** SRS 3.1.6: one volunteer per task from creation, required title and dueDate.
 * `assignments` will hold at most one ASSIGNED/ACCEPTED row at a time plus any
 * CANCELLED/DECLINED history from prior reassignment. */
export interface Task {
  id: string;
  createdAt: string;
  updatedAt: string;
  organisationId: string;
  incidentId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdByUserId: string | null;
  assignments: TaskAssignment[];
  notes: TaskNote[];
  photos: TaskPhoto[];
}

export type EventStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export interface EventRsvp {
  userId: string;
  rsvpedAt: string;
  user: { id: string; fullName: string; email: string } | null;
}

/** GET .../events (list) returns this shape without `incidents`/`rsvps` — see
 * EventSummary. The detail/create/status-update endpoints return the full
 * shape below. */
export interface Event {
  id: string;
  createdAt: string;
  updatedAt: string;
  organisationId: string;
  title: string;
  description: string | null;
  location: GeoPoint;
  scheduledAt: string;
  endsAt: string;
  maxAttendees: number | null;
  status: EventStatus;
  rsvpCount: number;
  createdByUserId: string | null;
  incidents: Incident[];
  rsvps: EventRsvp[];
}

export type EventSummary = Omit<Event, 'incidents' | 'rsvps'>;

export interface DashboardStats {
  totalIncidents: number;
  claimedThisMonth: number;
  awaitingClaimInServiceArea: number;
  resolvedIncidents: number;
  activeVolunteers: number;
  completedCleanupTasks: number;
  incidentsByCategory: { category: string; count: number }[];
}

/** GET /organisations/:id/dashboard/map — a projected, mappable subset of
 * Incident, not the full row. */
export interface DashboardMapIncident {
  id: string;
  title: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  verificationStatus: VerificationStatus | null;
  lat: number;
  lng: number;
}

export interface AuditLogEntry {
  id: string;
  organisationId: string | null;
  actingUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
