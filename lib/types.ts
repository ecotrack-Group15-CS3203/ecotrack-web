export type MembershipRole = 'community_user' | 'volunteer' | 'org_admin';

export interface Membership {
  organisationId: string;
  organisationName: string;
  organisationIsActive: boolean;
  role: MembershipRole;
}

export interface Profile {
  id: string;
  fullName: string;
  email: string;
  isPlatformAdmin: boolean;
  memberships: Membership[];
}

export interface Organisation {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrganisationMember {
  id: string;
  organisationId: string;
  userId: string;
  user: { id: string; fullName: string; email: string };
  role: MembershipRole;
  isActive: boolean;
  invitedAt: string | null;
  joinedAt: string | null;
}

export interface Invitation {
  id: string;
  organisationId: string;
  email: string;
  role: MembershipRole;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
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
  role: MembershipRole;
  expired: boolean;
  accepted: boolean;
  emailAlreadyRegistered: boolean;
}

export interface WorkflowStage {
  id: string;
  organisationId: string;
  name: string;
  position: number;
  isFinal: boolean;
}

export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'duplicate';
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

export interface Incident {
  id: string;
  organisationId: string;
  reportedByUserId: string;
  title: string;
  description: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  latitude: number;
  longitude: number;
  address: string | null;
  verificationStatus: VerificationStatus;
  currentStageId: string | null;
  currentStage: WorkflowStage | null;
  rejectionReason: string | null;
  duplicateOfId: string | null;
  verifiedByUserId: string | null;
  verifiedAt: string | null;
  images: IncidentImage[];
  createdAt: string;
}

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type AssignmentStatus = 'assigned' | 'accepted' | 'declined';

export interface TaskAssignment {
  id: string;
  volunteerUserId: string;
  volunteer: { id: string; fullName: string; email: string };
  status: AssignmentStatus;
  respondedAt: string | null;
}

export interface TaskNote {
  id: string;
  authorUserId: string;
  note: string;
  createdAt: string;
}

export interface TaskPhoto {
  id: string;
  url: string;
  uploadedByUserId: string;
}

export interface Task {
  id: string;
  organisationId: string;
  incidentId: string;
  incident: Incident;
  description: string;
  priority: TaskPriority;
  scheduledAt: string | null;
  status: TaskStatus;
  createdByUserId: string;
  assignments: TaskAssignment[];
  notes: TaskNote[];
  photos: TaskPhoto[];
  createdAt: string;
}

export interface DashboardStats {
  totalIncidents: number;
  pendingIncidents: number;
  verifiedIncidents: number;
  resolvedIncidents: number;
  activeVolunteers: number;
  completedCleanupTasks: number;
  incidentsByCategory: { category: string; count: number }[];
}

export interface PlatformStats {
  totalOrganisations: number;
  activeOrganisations: number;
  totalUsers: number;
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
