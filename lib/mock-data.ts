// Dummy data for local development when NEXT_PUBLIC_USE_MOCK_API=true. Mirrors
// the shapes the real NestJS backend would return, scoped to the "dev-org"
// organisation used by the NEXT_PUBLIC_DEV_BYPASS_AUTH profile.
import type {
  AuditLogEntry,
  DashboardStats,
  Incident,
  OrganisationMember,
  Task,
  WorkflowStage,
} from './types';

export const MOCK_ORG_ID = 'dev-org';

const STAGES: WorkflowStage[] = [
  { id: 'stage-reported', organisationId: MOCK_ORG_ID, name: 'Reported', position: 0, isFinal: false },
  { id: 'stage-review', organisationId: MOCK_ORG_ID, name: 'Under Review', position: 1, isFinal: false },
  { id: 'stage-verified', organisationId: MOCK_ORG_ID, name: 'Verified', position: 2, isFinal: false },
  { id: 'stage-scheduled', organisationId: MOCK_ORG_ID, name: 'Cleanup Scheduled', position: 3, isFinal: false },
  { id: 'stage-progress', organisationId: MOCK_ORG_ID, name: 'In Progress', position: 4, isFinal: false },
  { id: 'stage-resolved', organisationId: MOCK_ORG_ID, name: 'Resolved', position: 5, isFinal: true },
];

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

const MOCK_INCIDENTS: Incident[] = [
  { id: 'inc-1', organisationId: MOCK_ORG_ID, reportedByUserId: 'user-1', title: 'Illegal dumping near river bank', description: 'Several bags of household waste dumped by the riverside path.', category: 'illegal_dumping', severity: 'high', latitude: 6.9271, longitude: 79.8612, address: 'Riverside Rd', verificationStatus: 'approved', currentStageId: 'stage-resolved', currentStage: STAGES[5], rejectionReason: null, duplicateOfId: null, verifiedByUserId: 'user-admin', verifiedAt: daysAgo(20), images: [], createdAt: daysAgo(25) },
  { id: 'inc-2', organisationId: MOCK_ORG_ID, reportedByUserId: 'user-2', title: 'Oil sheen in canal water', description: 'Visible oil slick spreading near the storm drain outlet.', category: 'water_pollution', severity: 'critical', latitude: 6.9147, longitude: 79.8731, address: 'Canal Rd', verificationStatus: 'approved', currentStageId: 'stage-progress', currentStage: STAGES[4], rejectionReason: null, duplicateOfId: null, verifiedByUserId: 'user-admin', verifiedAt: daysAgo(10), images: [], createdAt: daysAgo(12) },
  { id: 'inc-3', organisationId: MOCK_ORG_ID, reportedByUserId: 'user-3', title: 'Smoke from open burning', description: 'Thick smoke reported from a vacant lot, likely burning waste.', category: 'air_pollution', severity: 'medium', latitude: 6.9319, longitude: 79.8478, address: 'Lotus Rd', verificationStatus: 'approved', currentStageId: 'stage-scheduled', currentStage: STAGES[3], rejectionReason: null, duplicateOfId: null, verifiedByUserId: 'user-admin', verifiedAt: daysAgo(6), images: [], createdAt: daysAgo(7) },
  { id: 'inc-4', organisationId: MOCK_ORG_ID, reportedByUserId: 'user-4', title: 'Tree clearing without permit', description: 'Multiple mature trees felled overnight near the reserve boundary.', category: 'deforestation', severity: 'high', latitude: 6.9022, longitude: 79.8607, address: 'Reserve Boundary Rd', verificationStatus: 'approved', currentStageId: 'stage-verified', currentStage: STAGES[2], rejectionReason: null, duplicateOfId: null, verifiedByUserId: 'user-admin', verifiedAt: daysAgo(3), images: [], createdAt: daysAgo(4) },
  { id: 'inc-5', organisationId: MOCK_ORG_ID, reportedByUserId: 'user-5', title: 'Injured bird near wetland', description: 'A visibly injured heron seen tangled in discarded fishing line.', category: 'wildlife_hazard', severity: 'medium', latitude: 6.9098, longitude: 79.8556, address: 'Wetland Path', verificationStatus: 'pending', currentStageId: 'stage-review', currentStage: STAGES[1], rejectionReason: null, duplicateOfId: null, verifiedByUserId: null, verifiedAt: null, images: [], createdAt: daysAgo(2) },
  { id: 'inc-6', organisationId: MOCK_ORG_ID, reportedByUserId: 'user-6', title: 'Overflowing public bin', description: 'Bin overflowing for several days, attracting pests.', category: 'other', severity: 'low', latitude: 6.9214, longitude: 79.8654, address: 'Market St', verificationStatus: 'pending', currentStageId: 'stage-reported', currentStage: STAGES[0], rejectionReason: null, duplicateOfId: null, verifiedByUserId: null, verifiedAt: null, images: [], createdAt: daysAgo(1) },
  { id: 'inc-7', organisationId: MOCK_ORG_ID, reportedByUserId: 'user-7', title: 'Litter near beach access path', description: 'Scattered litter, looks like an earlier report already covers this stretch.', category: 'illegal_dumping', severity: 'low', latitude: 6.9182, longitude: 79.8503, address: 'Beach Access Rd', verificationStatus: 'duplicate', currentStageId: 'stage-reported', currentStage: STAGES[0], rejectionReason: null, duplicateOfId: 'inc-1', verifiedByUserId: 'user-admin', verifiedAt: daysAgo(8), images: [], createdAt: daysAgo(9) },
  { id: 'inc-8', organisationId: MOCK_ORG_ID, reportedByUserId: 'user-8', title: 'Loud noise complaint', description: 'Reported as an environmental incident but is outside the org\'s scope.', category: 'other', severity: 'low', latitude: 6.9256, longitude: 79.8601, address: 'Temple Rd', verificationStatus: 'rejected', currentStageId: 'stage-reported', currentStage: STAGES[0], rejectionReason: 'Not an environmental incident.', duplicateOfId: null, verifiedByUserId: 'user-admin', verifiedAt: daysAgo(14), images: [], createdAt: daysAgo(15) },
];

const MOCK_VOLUNTEERS: OrganisationMember[] = [
  { id: 'mem-1', organisationId: MOCK_ORG_ID, userId: 'vol-1', user: { id: 'vol-1', fullName: 'Amara Silva', email: 'amara@example.com' }, role: 'volunteer', isActive: true, invitedAt: daysAgo(60), joinedAt: daysAgo(58) },
  { id: 'mem-2', organisationId: MOCK_ORG_ID, userId: 'vol-2', user: { id: 'vol-2', fullName: 'Nadeem Fernando', email: 'nadeem@example.com' }, role: 'volunteer', isActive: true, invitedAt: daysAgo(45), joinedAt: daysAgo(44) },
  { id: 'mem-3', organisationId: MOCK_ORG_ID, userId: 'vol-3', user: { id: 'vol-3', fullName: 'Priya Jayasuriya', email: 'priya@example.com' }, role: 'volunteer', isActive: true, invitedAt: daysAgo(30), joinedAt: daysAgo(29) },
];

const MOCK_TASKS: Task[] = [
  { id: 'task-1', organisationId: MOCK_ORG_ID, incidentId: 'inc-1', incident: MOCK_INCIDENTS[0], description: 'Clear dumped waste from riverside path', priority: 'high', scheduledAt: daysAgo(21), status: 'completed', createdByUserId: 'user-admin', assignments: [{ id: 'asg-1', volunteerUserId: 'vol-1', volunteer: { id: 'vol-1', fullName: 'Amara Silva', email: 'amara@example.com' }, status: 'accepted', respondedAt: daysAgo(20) }], notes: [], photos: [], createdAt: daysAgo(22) },
  { id: 'task-2', organisationId: MOCK_ORG_ID, incidentId: 'inc-2', incident: MOCK_INCIDENTS[1], description: 'Contain and report oil sheen to environmental authority', priority: 'high', scheduledAt: daysAgo(9), status: 'in_progress', createdByUserId: 'user-admin', assignments: [{ id: 'asg-2', volunteerUserId: 'vol-2', volunteer: { id: 'vol-2', fullName: 'Nadeem Fernando', email: 'nadeem@example.com' }, status: 'accepted', respondedAt: daysAgo(8) }], notes: [], photos: [], createdAt: daysAgo(10) },
  { id: 'task-3', organisationId: MOCK_ORG_ID, incidentId: 'inc-3', incident: MOCK_INCIDENTS[2], description: 'Coordinate cleanup crew for burn site', priority: 'medium', scheduledAt: daysAgo(1), status: 'pending', createdByUserId: 'user-admin', assignments: [{ id: 'asg-3', volunteerUserId: 'vol-1', volunteer: { id: 'vol-1', fullName: 'Amara Silva', email: 'amara@example.com' }, status: 'assigned', respondedAt: null }], notes: [], photos: [], createdAt: daysAgo(5) },
  { id: 'task-4', organisationId: MOCK_ORG_ID, incidentId: 'inc-1', incident: MOCK_INCIDENTS[0], description: 'Follow-up debris sweep', priority: 'low', scheduledAt: daysAgo(18), status: 'completed', createdByUserId: 'user-admin', assignments: [{ id: 'asg-4', volunteerUserId: 'vol-3', volunteer: { id: 'vol-3', fullName: 'Priya Jayasuriya', email: 'priya@example.com' }, status: 'accepted', respondedAt: daysAgo(17) }], notes: [], photos: [], createdAt: daysAgo(19) },
];

const MOCK_AUDIT_LOG: AuditLogEntry[] = [
  { id: 'log-1', organisationId: MOCK_ORG_ID, actingUserId: 'user-6', action: 'incident.reported', entityType: 'incident', entityId: 'inc-6', metadata: null, createdAt: daysAgo(1) },
  { id: 'log-2', organisationId: MOCK_ORG_ID, actingUserId: 'user-admin', action: 'incident.verified', entityType: 'incident', entityId: 'inc-4', metadata: null, createdAt: daysAgo(3) },
  { id: 'log-3', organisationId: MOCK_ORG_ID, actingUserId: 'vol-1', action: 'task.completed', entityType: 'task', entityId: 'task-4', metadata: null, createdAt: daysAgo(17) },
  { id: 'log-4', organisationId: MOCK_ORG_ID, actingUserId: 'vol-3', action: 'volunteer.joined', entityType: 'membership', entityId: 'mem-3', metadata: null, createdAt: daysAgo(29) },
  { id: 'log-5', organisationId: MOCK_ORG_ID, actingUserId: 'user-admin', action: 'task.assigned', entityType: 'task', entityId: 'task-3', metadata: null, createdAt: daysAgo(5) },
  { id: 'log-6', organisationId: MOCK_ORG_ID, actingUserId: 'vol-1', action: 'task.completed', entityType: 'task', entityId: 'task-1', metadata: null, createdAt: daysAgo(20) },
];

const MOCK_STATS: DashboardStats = {
  totalIncidents: MOCK_INCIDENTS.length,
  pendingIncidents: MOCK_INCIDENTS.filter((i) => i.verificationStatus === 'pending').length,
  verifiedIncidents: MOCK_INCIDENTS.filter((i) => i.verificationStatus === 'approved').length,
  resolvedIncidents: MOCK_INCIDENTS.filter((i) => i.currentStage?.isFinal).length,
  activeVolunteers: MOCK_VOLUNTEERS.filter((v) => v.isActive).length,
  completedCleanupTasks: MOCK_TASKS.filter((t) => t.status === 'completed').length,
  incidentsByCategory: Object.entries(
    MOCK_INCIDENTS.reduce<Record<string, number>>((acc, i) => {
      acc[i.category] = (acc[i.category] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([category, count]) => ({ category, count })),
};

/** Returns mock JSON for a known org-scoped path, or undefined if there's no mock for it. */
export function getMockResponse(path: string): unknown | undefined {
  const withoutQuery = path.split('?')[0];
  const query = new URLSearchParams(path.split('?')[1] ?? '');
  if (withoutQuery === `/organisations/${MOCK_ORG_ID}/dashboard/stats`) return MOCK_STATS;
  if (withoutQuery === `/organisations/${MOCK_ORG_ID}/dashboard/map`) return MOCK_INCIDENTS;
  if (withoutQuery === `/organisations/${MOCK_ORG_ID}/audit-logs`) return MOCK_AUDIT_LOG;
  if (withoutQuery === `/organisations/${MOCK_ORG_ID}/members`) return MOCK_VOLUNTEERS;
  if (withoutQuery === `/organisations/${MOCK_ORG_ID}/tasks`) return MOCK_TASKS;
  if (withoutQuery === `/organisations/${MOCK_ORG_ID}/incidents`) {
    const status = query.get('status');
    return status ? MOCK_INCIDENTS.filter((i) => i.verificationStatus === status) : MOCK_INCIDENTS;
  }
  if (withoutQuery === `/organisations/${MOCK_ORG_ID}/workflow-stages`) return STAGES;

  const incidentMatch = withoutQuery.match(new RegExp(`^/organisations/${MOCK_ORG_ID}/incidents/([^/]+)$`));
  if (incidentMatch) return MOCK_INCIDENTS.find((i) => i.id === incidentMatch[1]);

  return undefined;
}

/**
 * Simulates a write against the in-memory mock data (stage updates, dismiss/reject,
 * task creation) so the new incident actions are click-through demoable without a
 * real backend. Returns undefined for paths/methods it doesn't recognize.
 */
export function handleMockMutation(path: string, method: string, body: unknown): unknown | undefined {
  const withoutQuery = path.split('?')[0];

  const stageMatch = withoutQuery.match(new RegExp(`^/organisations/${MOCK_ORG_ID}/incidents/([^/]+)/stage$`));
  if (stageMatch && method === 'PATCH') {
    const incident = MOCK_INCIDENTS.find((i) => i.id === stageMatch[1]);
    const { stageId } = (body ?? {}) as { stageId?: string };
    const stage = STAGES.find((s) => s.id === stageId);
    if (!incident || !stage) return undefined;
    incident.currentStageId = stage.id;
    incident.currentStage = stage;
    return incident;
  }

  const rejectMatch = withoutQuery.match(new RegExp(`^/organisations/${MOCK_ORG_ID}/incidents/([^/]+)/reject$`));
  if (rejectMatch && method === 'PATCH') {
    const incident = MOCK_INCIDENTS.find((i) => i.id === rejectMatch[1]);
    const { reason } = (body ?? {}) as { reason?: string };
    if (!incident) return undefined;
    incident.verificationStatus = 'rejected';
    incident.rejectionReason = reason ?? null;
    return incident;
  }

  const approveMatch = withoutQuery.match(new RegExp(`^/organisations/${MOCK_ORG_ID}/incidents/([^/]+)/approve$`));
  if (approveMatch && method === 'PATCH') {
    const incident = MOCK_INCIDENTS.find((i) => i.id === approveMatch[1]);
    if (!incident) return undefined;
    incident.verificationStatus = 'approved';
    incident.verifiedAt = new Date().toISOString();
    return incident;
  }

  if (withoutQuery === `/organisations/${MOCK_ORG_ID}/tasks` && method === 'POST') {
    const input = (body ?? {}) as { incidentId: string; description: string; priority: Task['priority']; scheduledAt?: string };
    const incident = MOCK_INCIDENTS.find((i) => i.id === input.incidentId);
    if (!incident) return undefined;
    const task: Task = {
      id: `task-${MOCK_TASKS.length + 1}`,
      organisationId: MOCK_ORG_ID,
      incidentId: incident.id,
      incident,
      description: input.description,
      priority: input.priority,
      scheduledAt: input.scheduledAt ?? null,
      status: 'pending',
      createdByUserId: 'dev-user',
      assignments: [],
      notes: [],
      photos: [],
      createdAt: new Date().toISOString(),
    };
    MOCK_TASKS.push(task);
    return { id: task.id };
  }

  return undefined;
}
