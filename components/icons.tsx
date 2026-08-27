interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

function Icon({ d, className, style }: { d: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg aria-hidden="true" className={`icon ${className ?? ''}`} style={style} viewBox="0 0 24 24">
      <path d={d} />
    </svg>
  );
}

export const IconDashboard = (p: IconProps) => <Icon {...p} d="M3 11l9-8 9 8M5 10v10h14V10" />;
export const IconIncidents = (p: IconProps) => (
  <Icon {...p} d="M9 12l2 2 4-4M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />
);
export const IconTasks = (p: IconProps) => (
  <Icon {...p} d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
);
export const IconVolunteers = (p: IconProps) => (
  <Icon
    {...p}
    d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
  />
);
export const IconWorkflow = (p: IconProps) => <Icon {...p} d="M4 6h16M4 12h10M4 18h6" />;
export const IconEvents = (p: IconProps) => (
  <Icon {...p} d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
);
export const IconReports = (p: IconProps) => <Icon {...p} d="M3 3v18h18M7 15l4-4 3 3 5-6" />;
export const IconSettings = (p: IconProps) => (
  <Icon
    {...p}
    d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.36.4.66.72.86"
  />
);
export const IconOrganisations = (p: IconProps) => (
  <Icon {...p} d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1" />
);
export const IconPlatformAdmins = (p: IconProps) => (
  <Icon {...p} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
);
export const IconLeaf = (p: IconProps) => <Icon {...p} d="M12 2C8 6 4 9 4 14a8 8 0 0 0 16 0c0-5-4-8-8-12z" />;
export const IconBack = (p: IconProps) => <Icon {...p} d="M15 18l-6-6 6-6" />;
export const IconClose = (p: IconProps) => <Icon {...p} d="M18 6 6 18M6 6l12 12" />;
export const IconBell = (p: IconProps) => (
  <Icon {...p} d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
);
export const IconCheck = (p: IconProps) => <Icon {...p} d="M4 12l5 5L20 6" />;
export const IconDrag = (p: IconProps) => (
  <Icon {...p} d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" />
);
export const IconTrash = (p: IconProps) => <Icon {...p} d="M4 6h16M8 6V4h8v2M6 6l1 14h10l1-14" />;
export const IconPlus = (p: IconProps) => <Icon {...p} d="M12 5v14M5 12h14" />;
export const IconPin = ({ className, style, label }: IconProps & { style?: React.CSSProperties; label?: string }) => (
  <svg
    className={`map-pin ${className ?? ''}`}
    style={style}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    role={label ? 'img' : undefined}
    aria-hidden={label ? undefined : true}
  >
    {label && <title>{label}</title>}
    <path d="M12 2C8 6 4 9 4 14a8 8 0 0 0 16 0c0-5-4-8-8-12z" />
  </svg>
);
