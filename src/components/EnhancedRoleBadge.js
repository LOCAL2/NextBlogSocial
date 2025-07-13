'use client';

export default function EnhancedRoleBadge({ role, customBadges = [], publicTitles = [], size = 'sm' }) {
  const badges = [];

  // Add public titles first (highest priority)
  if (publicTitles && publicTitles.length > 0) {
    publicTitles.forEach((title, index) => {
      badges.push({
        color: `badge-${title.color}`,
        icon: title.icon || '👑',
        text: title.text,
        id: `public-title-${index}`,
        type: 'title'
      });
    });
  }

  // Add role badge for admin/dev only (never show USER badge or undefined role)
  if (role && ['admin', 'dev'].includes(role) && (!publicTitles || publicTitles.length === 0)) {
    const roleConfig = {
      admin: {
        color: 'badge-error',
        icon: '🛡️',
        text: 'ADMIN'
      },
      dev: {
        color: 'badge-secondary',
        icon: '💻',
        text: 'DEV'
      }
    };

    const config = roleConfig[role];
    if (config) {
      badges.push({
        ...config,
        id: `role-${role}`,
        type: 'role'
      });
    }
  }

  // Add custom badges
  if (customBadges && customBadges.length > 0) {
    customBadges.forEach((badge, index) => {
      badges.push({
        color: `badge-${badge.color}`,
        icon: badge.icon || '',
        text: badge.text,
        id: `custom-${index}`,
        type: 'custom'
      });
    });
  }

  if (badges.length === 0) return null;

  const sizeClasses = {
    xs: 'badge-xs text-xs',
    sm: 'badge-sm text-xs',
    md: 'badge-md text-sm',
    lg: 'badge-lg text-base'
  };

  return (
    <div className="flex gap-1 flex-wrap">
      {badges.map((badge) => (
        <div key={badge.id} className={`badge ${badge.color} ${sizeClasses[size]} gap-1 font-bold`}>
          {badge.icon && <span>{badge.icon}</span>}
          <span>{badge.text}</span>
        </div>
      ))}
    </div>
  );
}
