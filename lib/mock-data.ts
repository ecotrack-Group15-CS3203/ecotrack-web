// Dummy data for local development when NEXT_PUBLIC_USE_MOCK_API=true. Mirrors
// the shapes the real NestJS backend would return, scoped to the "dev-org"
// organisation used by the NEXT_PUBLIC_DEV_BYPASS_AUTH profile.
import type {
  AuditLogEntry,
  DashboardStats,
  Event,
  Incident,
  InviteLink,
  Organisation,
  OrganisationMember,
  Task,
  JoinRequest,
  WorkflowStage,
  WorkflowStageRuleSettings,
} from './types';
import { distanceKm } from './geo';

export class MockHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const MOCK_ORG_ID = 'dev-org';

const STAGES: WorkflowStage[] = [
  { id: 'stage-reported', organisationId: MOCK_ORG_ID, name: 'Reported', slug: 'reported', description: 'New reports waiting to be reviewed.', color: '#64748B', position: 0, orderIndex: 0, isFinal: false, isFixed: true },
  { id: 'stage-review', organisationId: MOCK_ORG_ID, name: 'Under Review', slug: 'under-review', description: 'A team member is checking the report.', color: '#E9B44C', position: 1, orderIndex: 1, isFinal: false },
  { id: 'stage-verified', organisationId: MOCK_ORG_ID, name: 'Verified', slug: 'verified', description: 'The report has been verified.', color: '#2563EB', position: 2, orderIndex: 2, isFinal: false },
  { id: 'stage-scheduled', organisationId: MOCK_ORG_ID, name: 'Cleanup Scheduled', slug: 'cleanup-scheduled', description: null, color: '#7C3AED', position: 3, orderIndex: 3, isFinal: false },
  { id: 'stage-progress', organisationId: MOCK_ORG_ID, name: 'In Progress', slug: 'in-progress', description: null, color: '#F97316', position: 4, orderIndex: 4, isFinal: false },
  { id: 'stage-resolved', organisationId: MOCK_ORG_ID, name: 'Resolved', slug: 'resolved', description: 'The work is complete.', color: '#0F6E56', position: 5, orderIndex: 5, isFinal: true },
];

let MOCK_STAGE_RULES: WorkflowStageRuleSettings = {
  taskCreation: { minimumStageId: 'stage-verified', targetStageId: 'stage-scheduled' },
  eventCreation: { minimumStageId: 'stage-verified', targetStageId: null },
  taskCompletion: { targetStageId: 'stage-resolved' },
  eventCompletion: { targetStageId: 'stage-resolved' },
};

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

// Only ever read/written from the browser (mock mutations run client-side), so
// window is always available here.
const ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';

const MOCK_INCIDENTS: Incident[] = [
  { id: 'inc-1', organisationId: MOCK_ORG_ID, claimedAt: daysAgo(25), reportedByUserId: 'user-1', title: 'Illegal dumping near river bank', description: 'Several bags of household waste dumped by the riverside path.', category: 'illegal_dumping', severity: 'high', latitude: 6.9271, longitude: 79.8612, address: 'Riverside Rd', verificationStatus: 'approved', currentStageId: 'stage-resolved', currentStage: STAGES[5], rejectionReason: null, duplicateOfId: null, verifiedByUserId: 'user-admin', verifiedAt: daysAgo(20), images: [], createdAt: daysAgo(25) },
  { id: 'inc-2', organisationId: MOCK_ORG_ID, claimedAt: daysAgo(12), reportedByUserId: 'user-2', title: 'Oil sheen in canal water', description: 'Visible oil slick spreading near the storm drain outlet.', category: 'water_pollution', severity: 'critical', latitude: 6.9147, longitude: 79.8731, address: 'Canal Rd', verificationStatus: 'approved', currentStageId: 'stage-progress', currentStage: STAGES[4], rejectionReason: null, duplicateOfId: null, verifiedByUserId: 'user-admin', verifiedAt: daysAgo(10), images: [], createdAt: daysAgo(12) },
  { id: 'inc-3', organisationId: MOCK_ORG_ID, claimedAt: daysAgo(7), reportedByUserId: 'user-3', title: 'Smoke from open burning', description: 'Thick smoke reported from a vacant lot, likely burning waste.', category: 'air_pollution', severity: 'medium', latitude: 6.9319, longitude: 79.8478, address: 'Lotus Rd', verificationStatus: 'approved', currentStageId: 'stage-scheduled', currentStage: STAGES[3], rejectionReason: null, duplicateOfId: null, verifiedByUserId: 'user-admin', verifiedAt: daysAgo(6), images: [], createdAt: daysAgo(7) },
  { id: 'inc-4', organisationId: MOCK_ORG_ID, claimedAt: daysAgo(4), reportedByUserId: 'user-4', title: 'Tree clearing without permit', description: 'Multiple mature trees felled overnight near the reserve boundary.', category: 'deforestation', severity: 'high', latitude: 6.9022, longitude: 79.8607, address: 'Reserve Boundary Rd', verificationStatus: 'approved', currentStageId: 'stage-verified', currentStage: STAGES[2], rejectionReason: null, duplicateOfId: null, verifiedByUserId: 'user-admin', verifiedAt: daysAgo(3), images: [], createdAt: daysAgo(4) },
  { id: 'inc-5', organisationId: MOCK_ORG_ID, claimedAt: daysAgo(2), reportedByUserId: 'user-5', title: 'Injured bird near wetland', description: 'A visibly injured heron seen tangled in discarded fishing line.', category: 'wildlife_hazard', severity: 'medium', latitude: 6.9098, longitude: 79.8556, address: 'Wetland Path', verificationStatus: 'pending', currentStageId: 'stage-review', currentStage: STAGES[1], rejectionReason: null, duplicateOfId: null, verifiedByUserId: null, verifiedAt: null, images: [], createdAt: daysAgo(2) },
  { id: 'inc-6', organisationId: MOCK_ORG_ID, claimedAt: daysAgo(1), reportedByUserId: 'user-6', title: 'Overflowing public bin', description: 'Bin overflowing for several days, attracting pests.', category: 'other', severity: 'low', latitude: 6.9214, longitude: 79.8654, address: 'Market St', verificationStatus: 'pending', currentStageId: 'stage-reported', currentStage: STAGES[0], rejectionReason: null, duplicateOfId: null, verifiedByUserId: null, verifiedAt: null, images: [], createdAt: daysAgo(1) },
  { id: 'inc-7', organisationId: MOCK_ORG_ID, claimedAt: daysAgo(9), reportedByUserId: 'user-7', title: 'Litter near beach access path', description: 'Scattered litter, looks like an earlier report already covers this stretch.', category: 'illegal_dumping', severity: 'low', latitude: 6.9182, longitude: 79.8503, address: 'Beach Access Rd', verificationStatus: 'duplicate', currentStageId: 'stage-reported', currentStage: STAGES[0], rejectionReason: null, duplicateOfId: 'inc-1', verifiedByUserId: 'user-admin', verifiedAt: daysAgo(8), images: [], createdAt: daysAgo(9) },
  { id: 'inc-8', organisationId: MOCK_ORG_ID, claimedAt: daysAgo(15), reportedByUserId: 'user-8', title: 'Loud noise complaint', description: 'Reported as an environmental incident but is outside the org\'s scope.', category: 'other', severity: 'low', latitude: 6.9256, longitude: 79.8601, address: 'Temple Rd', verificationStatus: 'rejected', currentStageId: 'stage-reported', currentStage: STAGES[0], rejectionReason: 'Not an environmental incident.', duplicateOfId: null, verifiedByUserId: 'user-admin', verifiedAt: daysAgo(14), images: [], createdAt: daysAgo(15) },
  // Unclaimed pool incidents: organisationId is null until an org within range claims them.
  { id: 'pool-1', organisationId: null, claimedAt: null, reportedByUserId: 'user-p1', reporter: { id: 'user-p1', fullName: 'Nimal Perera', email: 'nimal@example.com' }, title: 'Dumped construction debris on footpath', description: 'Broken tiles and cement bags blocking half the footpath near the junction.', category: 'illegal_dumping', severity: 'critical', latitude: 6.92, longitude: 79.865, address: 'Junction Rd', verificationStatus: 'pending', currentStageId: null, currentStage: null, rejectionReason: null, duplicateOfId: null, verifiedByUserId: null, verifiedAt: null, images: [], createdAt: daysAgo(0.2) },
  { id: 'pool-2', organisationId: null, claimedAt: null, reportedByUserId: 'user-p2', reporter: { id: 'user-p2', fullName: 'Chamari Wickrama', email: 'chamari@example.com' }, title: 'Storm drain blocked with plastic waste', description: 'Drain backing up onto the road after light rain due to plastic bottle buildup.', category: 'water_pollution', severity: 'medium', latitude: 6.94, longitude: 79.89, address: 'Lakeside Ave', verificationStatus: 'pending', currentStageId: null, currentStage: null, rejectionReason: null, duplicateOfId: null, verifiedByUserId: null, verifiedAt: null, images: [], createdAt: daysAgo(0.4) },
  { id: 'pool-3', organisationId: null, claimedAt: null, reportedByUserId: 'user-p3', reporter: { id: 'user-p3', fullName: 'Saman Kumara', email: 'saman@example.com' }, title: 'Roadside brush fire smoke', description: 'Ongoing smoke from a roadside brush fire, well outside the usual coverage area.', category: 'air_pollution', severity: 'low', latitude: 7.05, longitude: 79.98, address: 'Outer Ring Rd', verificationStatus: 'pending', currentStageId: null, currentStage: null, rejectionReason: null, duplicateOfId: null, verifiedByUserId: null, verifiedAt: null, images: [], createdAt: daysAgo(0.6) },
];

const MOCK_ORGANISATION_SERVICE_AREA = { latitude: 6.9147, longitude: 79.8612, radiusKm: 5 };

const MOCK_ORGANISATION: Organisation = {
  id: MOCK_ORG_ID,
  name: 'Dev Organisation',
  description: 'Local development organisation seeded for mock data.',
  contactEmail: 'contact@devorg.example',
  isActive: true,
  serviceArea: MOCK_ORGANISATION_SERVICE_AREA,
  createdAt: daysAgo(90),
  updatedAt: daysAgo(1),
};

const MOCK_INVITE_LINKS: InviteLink[] = [
  { id: 'invite-1', organisationId: MOCK_ORG_ID, token: 'inv-tok-1', url: `${ORIGIN}/accept-invite?token=inv-tok-1`, maxUses: 10, usesCount: 3, expiresAt: daysFromNow(5), createdAt: daysAgo(2) },
  { id: 'invite-2', organisationId: MOCK_ORG_ID, token: 'inv-tok-2', url: `${ORIGIN}/accept-invite?token=inv-tok-2`, maxUses: null, usesCount: 7, expiresAt: daysFromNow(20), createdAt: daysAgo(10) },
  { id: 'invite-3', organisationId: MOCK_ORG_ID, token: 'inv-tok-3', url: `${ORIGIN}/accept-invite?token=inv-tok-3`, maxUses: 5, usesCount: 5, expiresAt: daysAgo(1), createdAt: daysAgo(15) },
];



const MOCK_VOLUNTEERS: OrganisationMember[] = [
  { id: 'mem-1', organisationId: MOCK_ORG_ID, userId: 'vol-1', user: { id: 'vol-1', fullName: 'Amara Silva', email: 'amara@example.com' }, role: 'volunteer', isActive: true, invitedAt: daysAgo(60), joinedAt: daysAgo(58) },
  { id: 'mem-2', organisationId: MOCK_ORG_ID, userId: 'vol-2', user: { id: 'vol-2', fullName: 'Nadeem Fernando', email: 'nadeem@example.com' }, role: 'volunteer', isActive: true, invitedAt: daysAgo(45), joinedAt: daysAgo(44) },
  { id: 'mem-3', organisationId: MOCK_ORG_ID, userId: 'vol-3', user: { id: 'vol-3', fullName: 'Priya Jayasuriya', email: 'priya@example.com' }, role: 'volunteer', isActive: true, invitedAt: daysAgo(30), joinedAt: daysAgo(29) },
];

const MOCK_JOIN_REQUESTS: JoinRequest[] = [
  {
    id: 'join-1', organisationId: MOCK_ORG_ID, requesterUserId: 'join-user-1',
    requester: { id: 'join-user-1', fullName: 'Kavindi Perera', email: 'kavindi@example.com' },
    message: 'I would like to help with weekend cleanups near the river.', status: 'pending',
    createdAt: daysAgo(1), updatedAt: daysAgo(1),
  },
  {
    id: 'join-2', organisationId: MOCK_ORG_ID, requesterUserId: 'join-user-2',
    requester: { id: 'join-user-2', fullName: 'Ruwan Dias', email: 'ruwan@example.com' },
    message: 'Happy to support community environmental work.', status: 'pending',
    createdAt: daysAgo(3), updatedAt: daysAgo(3),
  },
  {
    id: 'join-3', organisationId: MOCK_ORG_ID, requesterUserId: 'join-user-3',
    requester: { id: 'join-user-3', fullName: 'Shehani Fernando', email: 'shehani@example.com' },
    message: null, status: 'approved', createdAt: daysAgo(10), updatedAt: daysAgo(8),
  },
  {
    id: 'join-4', organisationId: MOCK_ORG_ID, requesterUserId: 'join-user-4',
    requester: { id: 'join-user-4', fullName: 'Malith Senanayake', email: 'malith@example.com' },
    message: 'Please consider my application.', status: 'rejected', createdAt: daysAgo(14), updatedAt: daysAgo(12),
  },
];

const MOCK_TASKS: Task[] = [
  {
    id: 'task-1',
    organisationId: MOCK_ORG_ID,
    incidentId: 'inc-1',
    incident: MOCK_INCIDENTS[0],
    title: 'Clear dumped waste from riverside path',
    description: 'Clear dumped waste from riverside path',
    priority: 'high',
    scheduledAt: daysAgo(21),
    status: 'completed',
    createdByUserId: 'user-admin',
    assignments: [{ id: 'asg-1', volunteerUserId: 'vol-1', volunteer: { id: 'vol-1', fullName: 'Amara Silva', email: 'amara@example.com' }, status: 'accepted', respondedAt: daysAgo(20) }],
    notes: [],
    photos: [
      { id: 'photo-1', url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="%230F6E56"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="10" font-family="sans-serif">Riverside Debris</text></svg>', uploadedByUserId: 'vol-1' },
      { id: 'photo-2', url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="%23185FA5"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="10" font-family="sans-serif">Clean Path</text></svg>', uploadedByUserId: 'vol-1' }
    ],
    createdAt: daysAgo(22)
  },
  { id: 'task-2', organisationId: MOCK_ORG_ID, incidentId: 'inc-2', incident: MOCK_INCIDENTS[1], title: 'Contain and report oil sheen', description: 'Contain and report oil sheen to environmental authority', priority: 'high', scheduledAt: daysAgo(9), status: 'in_progress', createdByUserId: 'user-admin', assignments: [{ id: 'asg-2', volunteerUserId: 'vol-2', volunteer: { id: 'vol-2', fullName: 'Nadeem Fernando', email: 'nadeem@example.com' }, status: 'accepted', respondedAt: daysAgo(8) }], notes: [], photos: [], createdAt: daysAgo(10) },
  { id: 'task-3', organisationId: MOCK_ORG_ID, incidentId: 'inc-3', incident: MOCK_INCIDENTS[2], title: 'Coordinate cleanup crew for burn site', description: 'Coordinate cleanup crew for burn site', priority: 'medium', scheduledAt: daysAgo(1), status: 'pending', createdByUserId: 'user-admin', assignments: [{ id: 'asg-3', volunteerUserId: 'vol-1', volunteer: { id: 'vol-1', fullName: 'Amara Silva', email: 'amara@example.com' }, status: 'assigned', respondedAt: null }], notes: [], photos: [], createdAt: daysAgo(5) },
  {
    id: 'task-4',
    organisationId: MOCK_ORG_ID,
    incidentId: 'inc-1',
    incident: MOCK_INCIDENTS[0],
    title: 'Follow-up debris sweep',
    description: 'Follow-up debris sweep',
    priority: 'low',
    scheduledAt: daysAgo(18),
    status: 'completed',
    createdByUserId: 'user-admin',
    assignments: [{ id: 'asg-4', volunteerUserId: 'vol-3', volunteer: { id: 'vol-3', fullName: 'Priya Jayasuriya', email: 'priya@example.com' }, status: 'accepted', respondedAt: daysAgo(17) }],
    notes: [],
    photos: [
      { id: 'photo-3', url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="%23534AB7"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="10" font-family="sans-serif">Sweep Complete</text></svg>', uploadedByUserId: 'vol-3' }
    ],
    createdAt: daysAgo(19)
  },
];

function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString();
}

const MOCK_EVENTS: Event[] = [
  {
    id: 'evt-1',
    organisationId: MOCK_ORG_ID,
    incidentIds: ['inc-2'],
    incidents: [MOCK_INCIDENTS[1]],
    title: 'Canal cleanup and oil containment day',
    description: 'Community cleanup event to contain the oil sheen and clear surrounding debris.',
    latitude: 6.9147,
    longitude: 79.8731,
    address: 'Canal Rd',
    scheduledAt: daysFromNow(3),
    endsAt: daysFromNow(3),
    maxAttendees: 20,
    status: 'scheduled',
    rsvps: [
      { id: 'rsvp-1', volunteerUserId: 'vol-1', volunteer: { id: 'vol-1', fullName: 'Amara Silva', email: 'amara@example.com' }, rsvpedAt: daysAgo(2) },
      { id: 'rsvp-2', volunteerUserId: 'vol-2', volunteer: { id: 'vol-2', fullName: 'Nadeem Fernando', email: 'nadeem@example.com' }, rsvpedAt: daysAgo(1) },
    ],
    createdByUserId: 'dev-user',
    createdAt: daysAgo(4),
  },
  {
    id: 'evt-2',
    organisationId: MOCK_ORG_ID,
    incidentIds: ['inc-1', 'inc-4'],
    incidents: [MOCK_INCIDENTS[0], MOCK_INCIDENTS[3]],
    title: 'Riverside and reserve boundary restoration',
    description: 'Joint cleanup and replanting effort covering the riverside path and reserve boundary.',
    latitude: 6.9271,
    longitude: 79.8612,
    address: 'Riverside Rd',
    scheduledAt: daysAgo(20),
    endsAt: daysAgo(20),
    maxAttendees: null,
    status: 'completed',
    rsvps: [
      { id: 'rsvp-3', volunteerUserId: 'vol-3', volunteer: { id: 'vol-3', fullName: 'Priya Jayasuriya', email: 'priya@example.com' }, rsvpedAt: daysAgo(22) },
    ],
    createdByUserId: 'dev-user',
    createdAt: daysAgo(23),
  },
];

const MOCK_AUDIT_LOG: AuditLogEntry[] = [
  { id: 'log-1', organisationId: MOCK_ORG_ID, actingUserId: 'user-6', action: 'incident.reported', entityType: 'incident', entityId: 'inc-6', metadata: null, createdAt: daysAgo(1) },
  { id: 'log-2', organisationId: MOCK_ORG_ID, actingUserId: 'user-admin', action: 'incident.verified', entityType: 'incident', entityId: 'inc-4', metadata: null, createdAt: daysAgo(3) },
  { id: 'log-3', organisationId: MOCK_ORG_ID, actingUserId: 'vol-1', action: 'task.completed', entityType: 'task', entityId: 'task-4', metadata: null, createdAt: daysAgo(17) },
  { id: 'log-4', organisationId: MOCK_ORG_ID, actingUserId: 'vol-3', action: 'volunteer.joined', entityType: 'membership', entityId: 'mem-3', metadata: null, createdAt: daysAgo(29) },
  { id: 'log-5', organisationId: MOCK_ORG_ID, actingUserId: 'user-admin', action: 'task.assigned', entityType: 'task', entityId: 'task-3', metadata: null, createdAt: daysAgo(5) },
  { id: 'log-6', organisationId: MOCK_ORG_ID, actingUserId: 'vol-1', action: 'task.completed', entityType: 'task', entityId: 'task-1', metadata: null, createdAt: daysAgo(20) },
];

const MOCK_ORG_INCIDENTS = MOCK_INCIDENTS.filter((i) => i.organisationId === MOCK_ORG_ID);

const MOCK_STATS: DashboardStats = {
  totalIncidents: MOCK_ORG_INCIDENTS.length,
  pendingIncidents: MOCK_ORG_INCIDENTS.filter((i) => i.verificationStatus === 'pending').length,
  verifiedIncidents: MOCK_ORG_INCIDENTS.filter((i) => i.verificationStatus === 'approved').length,
  resolvedIncidents: MOCK_ORG_INCIDENTS.filter((i) => i.currentStage?.isFinal).length,
  activeVolunteers: MOCK_VOLUNTEERS.filter((v) => v.isActive).length,
  completedCleanupTasks: MOCK_TASKS.filter((t) => t.status === 'completed').length,
  incidentsByCategory: Object.entries(
    MOCK_ORG_INCIDENTS.reduce<Record<string, number>>((acc, i) => {
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
  if (withoutQuery === `/organisations/${MOCK_ORG_ID}/dashboard/map`) return MOCK_INCIDENTS.filter((i) => i.organisationId === MOCK_ORG_ID);
  if (withoutQuery === `/organisations/${MOCK_ORG_ID}/audit-logs`) return MOCK_AUDIT_LOG;
  if (withoutQuery === `/organisations/${MOCK_ORG_ID}/members`) return MOCK_VOLUNTEERS;
  if (withoutQuery === `/organisations/${MOCK_ORG_ID}/tasks`) {
    const status = query.get('status');
    return status ? MOCK_TASKS.filter((t) => t.status === status) : MOCK_TASKS;
  }
  if (withoutQuery === `/organisations/${MOCK_ORG_ID}/incidents`) {
    const status = query.get('status');
    const ownIncidents = MOCK_INCIDENTS.filter((i) => i.organisationId === MOCK_ORG_ID);
    return status ? ownIncidents.filter((i) => i.verificationStatus === status) : ownIncidents;
  }
  if (withoutQuery === `/organisations/${MOCK_ORG_ID}/incident-pool`) {
    const area = MOCK_ORGANISATION_SERVICE_AREA;
    return MOCK_INCIDENTS.filter(
      (i) => i.organisationId === null && distanceKm(area.latitude, area.longitude, i.latitude, i.longitude) <= area.radiusKm,
    );
  }
  if (withoutQuery === `/organisations/${MOCK_ORG_ID}/workflow-stages`) return STAGES;
  if (withoutQuery === '/v1/workflows/stages') return STAGES;
  if (withoutQuery === '/v1/workflows/stage-rules') return MOCK_STAGE_RULES;
  if (withoutQuery === `/organisations/${MOCK_ORG_ID}/events`) return MOCK_EVENTS;
  if (withoutQuery === `/v1/organizations/${MOCK_ORG_ID}/join-requests`) return MOCK_JOIN_REQUESTS;
  if (withoutQuery === `/v1/organizations/${MOCK_ORG_ID}/invites`) return MOCK_INVITE_LINKS;
  if (withoutQuery === `/organisations/${MOCK_ORG_ID}` || withoutQuery === `/v1/organizations/${MOCK_ORG_ID}`) {
    return MOCK_ORGANISATION;
  }

  const incidentMatch = withoutQuery.match(new RegExp(`^/organisations/${MOCK_ORG_ID}/incidents/([^/]+)$`));
  if (incidentMatch) return MOCK_INCIDENTS.find((i) => i.id === incidentMatch[1]);

  const taskMatch = withoutQuery.match(new RegExp(`^/organisations/${MOCK_ORG_ID}/tasks/([^/]+)$`));
  if (taskMatch) return MOCK_TASKS.find((t) => t.id === taskMatch[1]);

  const eventMatch = withoutQuery.match(new RegExp(`^/organisations/${MOCK_ORG_ID}/events/([^/]+)$`));
  if (eventMatch) return MOCK_EVENTS.find((e) => e.id === eventMatch[1]);

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
    const input = (body ?? {}) as {
      incidentId: string;
      title: string;
      description: string;
      priority: Task['priority'];
      scheduledAt?: string;
      assignedTo?: string;
    };
    const incident = MOCK_INCIDENTS.find((i) => i.id === input.incidentId);
    if (!incident) return undefined;
    const volunteer = input.assignedTo ? MOCK_VOLUNTEERS.find((v) => v.userId === input.assignedTo) : undefined;
    const task: Task = {
      id: `task-${MOCK_TASKS.length + 1}`,
      organisationId: MOCK_ORG_ID,
      incidentId: incident.id,
      incident,
      title: input.title,
      description: input.description,
      priority: input.priority,
      scheduledAt: input.scheduledAt ?? null,
      status: 'pending',
      createdByUserId: 'dev-user',
      assignments: volunteer
        ? [
            {
              id: `asg-${MOCK_TASKS.length + 1}`,
              volunteerUserId: volunteer.userId,
              volunteer: volunteer.user,
              status: 'assigned',
              respondedAt: null,
            },
          ]
        : [],
      notes: [],
      photos: [],
      createdAt: new Date().toISOString(),
    };
    MOCK_TASKS.push(task);
    return { id: task.id };
  }

  const taskMatch = withoutQuery.match(new RegExp(`^/organisations/${MOCK_ORG_ID}/tasks/([^/]+)$`));
  if (taskMatch && method === 'PATCH') {
    const task = MOCK_TASKS.find((t) => t.id === taskMatch[1]);
    if (!task) return undefined;
    const updates = (body ?? {}) as Partial<Pick<Task, 'priority' | 'scheduledAt' | 'status'>>;
    Object.assign(task, updates);
    return task;
  }

  const assignMatch = withoutQuery.match(new RegExp(`^/organisations/${MOCK_ORG_ID}/tasks/([^/]+)/assignments$`));
  if (assignMatch && method === 'POST') {
    const task = MOCK_TASKS.find((t) => t.id === assignMatch[1]);
    const { volunteerUserIds } = (body ?? {}) as { volunteerUserIds?: string[] };
    if (!task || !volunteerUserIds) return undefined;
    for (const userId of volunteerUserIds) {
      const volunteer = MOCK_VOLUNTEERS.find((v) => v.userId === userId);
      if (!volunteer) continue;
      task.assignments.push({
        id: `asg-${task.id}-${task.assignments.length + 1}`,
        volunteerUserId: volunteer.userId,
        volunteer: volunteer.user,
        status: 'assigned',
        respondedAt: null,
      });
    }
    return task;
  }

  const unassignMatch = withoutQuery.match(
    new RegExp(`^/organisations/${MOCK_ORG_ID}/tasks/([^/]+)/assignments/([^/]+)$`),
  );
  if (unassignMatch && method === 'DELETE') {
    const task = MOCK_TASKS.find((t) => t.id === unassignMatch[1]);
    if (!task) return undefined;
    task.assignments = task.assignments.filter((a) => a.id !== unassignMatch[2]);
    return task;
  }

  if (withoutQuery === `/organisations/${MOCK_ORG_ID}/events` && method === 'POST') {
    const input = (body ?? {}) as {
      incidentIds: string[];
      title: string;
      description: string;
      latitude: number;
      longitude: number;
      address?: string;
      scheduledAt: string;
      endsAt?: string;
      maxAttendees?: number;
    };
    const incidents = MOCK_INCIDENTS.filter((i) => input.incidentIds.includes(i.id));
    if (incidents.length === 0) return undefined;
    const event: Event = {
      id: `evt-${MOCK_EVENTS.length + 1}`,
      organisationId: MOCK_ORG_ID,
      incidentIds: incidents.map((i) => i.id),
      incidents,
      title: input.title,
      description: input.description,
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address ?? null,
      scheduledAt: input.scheduledAt,
      endsAt: input.endsAt ?? null,
      maxAttendees: input.maxAttendees ?? null,
      status: 'scheduled',
      rsvps: [],
      createdByUserId: 'dev-user',
      createdAt: new Date().toISOString(),
    };
    MOCK_EVENTS.push(event);
    return { id: event.id };
  }

  const eventStatusMatch = withoutQuery.match(new RegExp(`^/organisations/${MOCK_ORG_ID}/events/([^/]+)/status$`));
  if (eventStatusMatch && method === 'PATCH') {
    const event = MOCK_EVENTS.find((e) => e.id === eventStatusMatch[1]);
    const { status } = (body ?? {}) as { status?: Event['status'] };
    if (!event || !status) return undefined;
    event.status = status;
    return event;
  }

  const claimMatch = withoutQuery.match(new RegExp(`^/organisations/${MOCK_ORG_ID}/incidents/([^/]+)/claim$`));
  if (claimMatch && method === 'POST') {
    const incident = MOCK_INCIDENTS.find((i) => i.id === claimMatch[1]);
    if (!incident) return undefined;
    if (incident.organisationId !== null) {
      throw new MockHttpError(409, 'This incident has already been claimed by another organisation.');
    }
    const area = MOCK_ORGANISATION_SERVICE_AREA;
    const distance = distanceKm(area.latitude, area.longitude, incident.latitude, incident.longitude);
    if (distance > area.radiusKm) {
      throw new MockHttpError(422, "This incident is outside your organisation's registered service area.");
    }
    incident.organisationId = MOCK_ORG_ID;
    incident.claimedAt = new Date().toISOString();
    return incident;
  }

  const suspendMatch = withoutQuery.match(new RegExp(`^/(?:v1/)?organi[sz]ations/${MOCK_ORG_ID}/volunteers/([^/]+)$`));
  if (suspendMatch && method === 'DELETE') {
    const member = MOCK_VOLUNTEERS.find((v) => v.userId === suspendMatch[1]);
    if (!member) return undefined;
    // Suspends the membership only — the underlying user account is untouched.
    member.isActive = false;
    return member;
  }

  const orgProfileMatch = withoutQuery.match(new RegExp(`^/(?:v1/)?organi[sz]ations/${MOCK_ORG_ID}$`));
  if (orgProfileMatch && method === 'PATCH') {
    const updates = (body ?? {}) as Partial<Pick<Organisation, 'name' | 'description' | 'contactEmail' | 'serviceArea'>>;
    Object.assign(MOCK_ORGANISATION, updates, { updatedAt: new Date().toISOString() });
    return MOCK_ORGANISATION;
  }

  if (withoutQuery === `/v1/organizations/${MOCK_ORG_ID}/invites` && method === 'POST') {
    const input = (body ?? {}) as { maxUses?: number | null; expiresInDays?: number };
    const token = `inv-${Math.random().toString(36).slice(2, 10)}`;
    const link: InviteLink = {
      id: `invite-${MOCK_INVITE_LINKS.length + 1}`,
      organisationId: MOCK_ORG_ID,
      token,
      url: `${ORIGIN}/accept-invite?token=${token}`,
      maxUses: input.maxUses ?? null,
      usesCount: 0,
      expiresAt: daysFromNow(input.expiresInDays ?? 7),
      createdAt: new Date().toISOString(),
    };
    MOCK_INVITE_LINKS.unshift(link);
    return link;
  }

  const joinRequestMatch = withoutQuery.match(
    new RegExp(`^/v1/organizations/${MOCK_ORG_ID}/join-requests/([^/]+)$`),
  );
  if (joinRequestMatch && method === 'PATCH') {
    const request = MOCK_JOIN_REQUESTS.find((item) => item.id === joinRequestMatch[1]);
    const { status } = (body ?? {}) as { status?: JoinRequest['status'] };
    if (!request || !status) return undefined;
    if (status === 'approved' && request.id === 'join-2') {
      throw new MockHttpError(409, 'Approval is blocked because this requester already holds an active membership elsewhere.');
    }
    request.status = status;
    request.updatedAt = new Date().toISOString();
    return request;
  }

  if (withoutQuery === '/v1/workflows/stages/reorder' && method === 'PATCH') {
    const { orderedStageIds } = (body ?? {}) as { orderedStageIds?: string[] };
    if (!orderedStageIds || orderedStageIds.length !== STAGES.length || orderedStageIds[0] !== 'stage-reported') {
      throw new MockHttpError(400, 'The Reported stage must remain first.');
    }
    const reordered = orderedStageIds.map((id) => STAGES.find((stage) => stage.id === id));
    if (reordered.some((stage) => !stage)) return undefined;
    STAGES.splice(0, STAGES.length, ...(reordered as WorkflowStage[]));
    STAGES.forEach((stage, index) => {
      stage.position = index;
      stage.orderIndex = index;
    });
    return STAGES;
  }

  if (withoutQuery === '/v1/workflows/stages' && method === 'POST') {
    const input = (body ?? {}) as { name?: string; description?: string; color?: string; isFinal?: boolean };
    if (!input.name?.trim()) return undefined;
    const slugBase = input.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const slug = `${slugBase || 'stage'}-${STAGES.length + 1}`;
    const stage: WorkflowStage = {
      id: `stage-${STAGES.length + 1}`, organisationId: MOCK_ORG_ID, name: input.name.trim(), slug,
      description: input.description?.trim() || null, color: input.color || '#0F6E56',
      position: STAGES.length, orderIndex: STAGES.length, isFinal: Boolean(input.isFinal),
    };
    STAGES.push(stage);
    return stage;
  }

  if (withoutQuery === '/v1/workflows/stage-rules' && method === 'PATCH') {
    MOCK_STAGE_RULES = body as WorkflowStageRuleSettings;
    return MOCK_STAGE_RULES;
  }

  const modernStageMatch = withoutQuery.match(/^\/v1\/workflows\/stages\/([^/]+)$/);
  if (modernStageMatch && method === 'PATCH') {
    const stage = STAGES.find((item) => item.id === modernStageMatch[1]);
    const updates = (body ?? {}) as Partial<Pick<WorkflowStage, 'name' | 'description' | 'color' | 'isFinal'>>;
    if (!stage) return undefined;
    Object.assign(stage, updates);
    return stage;
  }
  if (modernStageMatch && method === 'DELETE') {
    const stage = STAGES.find((item) => item.id === modernStageMatch[1]);
    if (!stage) return undefined;
    if (stage.isFixed) throw new MockHttpError(400, 'The Reported stage cannot be deleted.');
    if (stage.id === 'stage-review') throw new MockHttpError(409, 'This stage cannot be deleted because incidents are currently in it.');
    STAGES.splice(STAGES.indexOf(stage), 1);
    STAGES.forEach((item, index) => {
      item.position = index;
      item.orderIndex = index;
    });
    return null;
  }

  return undefined;
}
