'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useApiGet } from '@/lib/use-org-api';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Drawer,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Spinner,
} from '@/components/ui';
import type { OrganisationMember, Task } from '@/lib/types';
import { ApiError } from '@/lib/api';

export default function VolunteersPage() {
  const router = useRouter();
  const { activeOrgId } = useAuth();
  const [selectedVolunteer, setSelectedVolunteer] = useState<OrganisationMember | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>('desc');

  const volunteersPath = activeOrgId ? `/organisations/${activeOrgId}/members?role=volunteer` : null;
  const { data: volunteers, error: volunteersError } = useApiGet<OrganisationMember[]>(volunteersPath);

  const tasksPath = activeOrgId ? `/organisations/${activeOrgId}/tasks` : null;
  const { data: tasks } = useApiGet<Task[]>(tasksPath);

  const completedTasksCountByUser = useMemo(() => {
    const counts = new Map<string, number>();
    (tasks ?? [])
      .filter((t) => t.status === 'completed')
      .forEach((t) =>
        t.assignments.forEach((a) => counts.set(a.volunteerUserId, (counts.get(a.volunteerUserId) ?? 0) + 1)),
      );
    return counts;
  }, [tasks]);

  const activeTaskCountByUser = useMemo(() => {
    const counts = new Map<string, number>();
    (tasks ?? [])
      .filter((t) => t.status !== 'completed')
      .forEach((t) =>
        t.assignments.forEach((a) => counts.set(a.volunteerUserId, (counts.get(a.volunteerUserId) ?? 0) + 1)),
      );
    return counts;
  }, [tasks]);

  const handleSortCompleted = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : prev === 'asc' ? null : 'desc'));
  };

  const sortedVolunteers = useMemo(() => {
    if (!volunteers) return [];
    const list = [...volunteers];
    if (sortOrder) {
      list.sort((a, b) => {
        const countA = completedTasksCountByUser.get(a.id) ?? 0;
        const countB = completedTasksCountByUser.get(b.id) ?? 0;
        return sortOrder === 'desc' ? countB - countA : countA - countB;
      });
    }
    return list;
  }, [volunteers, sortOrder, completedTasksCountByUser]);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // Tasks and events for the currently selected volunteer
  const selectedVolunteerTasks = useMemo(() => {
    if (!tasks || !selectedVolunteer) return [];
    return tasks
      .filter((t) => t.assignments.some((a) => a.volunteerUserId === selectedVolunteer.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tasks, selectedVolunteer]);

  return (
    <div>
      <PageHeader
        title="Volunteers"
        description="Registered volunteers for your organisation"
        action={<Button variant="secondary" onClick={() => router.push('/settings')}>Manage invite links</Button>}
      />

      {volunteersError && (
        <ErrorBanner
          message={volunteersError instanceof ApiError ? volunteersError.message : 'Failed to load volunteers'}
        />
      )}
      {!volunteers && !volunteersError && <Spinner />}

      {volunteers && (
        <Card>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Joined At</th>
                <th
                  onClick={handleSortCompleted}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title="Click to sort by tasks completed"
                >
                  Tasks Completed{' '}
                  {sortOrder === 'desc' ? '▼' : sortOrder === 'asc' ? '▲' : '↕'}
                </th>
                <th>Active Tasks</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedVolunteers.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => setSelectedVolunteer(v)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div className="row-flex">
                      <Avatar name={v.fullName} />
                      {v.fullName}
                    </div>
                  </td>
                  <td>{v.email}</td>
                  <td>{formatDate(v.createdAt)}</td>
                  <td>{completedTasksCountByUser.get(v.id) ?? 0}</td>
                  <td>{activeTaskCountByUser.get(v.id) ?? 0}</td>
                  <td>
                    <Chip tone={v.isActive ? 'active' : 'inactive'}>
                      {v.isActive ? 'active' : 'inactive'}
                    </Chip>
                  </td>
                </tr>
              ))}
              {sortedVolunteers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '32px 0' }}>
                    No volunteers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* Volunteer Profile Drawer */}
      <Drawer
        open={!!selectedVolunteer}
        onClose={() => setSelectedVolunteer(null)}
        title="Volunteer Profile"
      >
        {selectedVolunteer && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 20 }}>
            {/* Profile Overview */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              <Avatar name={selectedVolunteer.fullName} size={50} />
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{selectedVolunteer.fullName}</h3>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                  <Chip tone={selectedVolunteer.isActive ? 'active' : 'inactive'}>
                    {selectedVolunteer.isActive ? 'active' : 'inactive'}
                  </Chip>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Joined {formatDate(selectedVolunteer.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Contact details */}
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>
                Personal Details
              </h4>
              <div style={{ fontSize: 13.5, display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8 }}>
                <span style={{ color: 'var(--text-2)' }}>Email:</span>
                <span style={{ wordBreak: 'break-all' }}>{selectedVolunteer.email}</span>
                <span style={{ color: 'var(--text-2)' }}>Role:</span>
                <span style={{ textTransform: 'capitalize' }}>{selectedVolunteer.role.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Task History */}
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
                Task History ({completedTasksCountByUser.get(selectedVolunteer.id) ?? 0} completed,{' '}
                {activeTaskCountByUser.get(selectedVolunteer.id) ?? 0} active)
              </h4>
              {selectedVolunteerTasks.length === 0 ? (
                <EmptyState>
                  <p style={{ fontSize: 13, margin: 0 }}>No task history found.</p>
                </EmptyState>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 200, overflowY: 'auto', paddingRight: 4 }}>
                  {selectedVolunteerTasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        padding: 10,
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        background: '#FAF9F5',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.title}
                        </span>
                        <Chip tone={task.status}>{task.status}</Chip>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Priority: {task.priority}</span>
                        <span>
                          {task.status === 'completed'
                            ? `Completed: ${formatDate(task.completedAt ?? task.dueDate)}`
                            : `Due: ${formatDate(task.dueDate)}`}
                        </span>
                      </div>
                      {/* Evidence Thumbnails */}
                      {task.photos && task.photos.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                          {task.photos.map((photo) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={photo.id}
                              src={photo.url}
                              alt="Evidence thumbnail"
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 4,
                                objectFit: 'cover',
                                border: '1px solid var(--border)',
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
