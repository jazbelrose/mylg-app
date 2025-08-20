export function slugify(str: string): string {
  return encodeURIComponent(
    str
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
  );
}

export function findUserBySlug(users: any[], slug: string): any | null {
  if (!Array.isArray(users)) return null;
  return users.find(u => slugify(`${u.firstName || ''}-${u.lastName || ''}`) === slug) || null;
}

export function findProjectBySlug(projects: any[], slug: string): any | null {
  if (!Array.isArray(projects)) return null;
  return projects.find(p => slugify(p.title || '') === slug) || null;
}