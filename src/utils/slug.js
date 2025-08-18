export function slugify(str) {
  return encodeURIComponent(
    str
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
  );
}

export function findUserBySlug(users, slug) {
  if (!Array.isArray(users)) return null;
  return users.find(u => slugify(`${u.firstName || ''}-${u.lastName || ''}`) === slug);
}

export function findProjectBySlug(projects, slug) {
  if (!Array.isArray(projects)) return null;
  return projects.find(p => slugify(p.title || '') === slug);
}