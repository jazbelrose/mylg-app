// api.ts
import { waitForAuthReady } from './waitForAuthReady';
import { csrfProtection, rateLimiter, logSecurityEvent } from './securityUtils';

// ───────────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────────

export interface ApiEndpoints {
  [key: string]: string;
}

export interface ApiFetchOptions extends RequestInit {
  retryCount?: number;
  retryDelay?: number;          // ms
  skipRateLimit?: boolean;
  onNetworkError?: (error: Error) => void;
}

type JsonRecord = Record<string, unknown>;

export interface UserProfile extends JsonRecord {
  userId: string;
  username?: string;
  email?: string;
  role?: string;
}

export interface Project extends JsonRecord {
  projectId: string;
  name?: string;
  description?: string;
}

export interface Task extends JsonRecord {
  taskId?: string;
  projectId: string;
  title: string;
  description?: string;
  budgetItemId?: string | null;
  status?: 'todo' | 'in_progress' | 'done';
  assigneeId?: string;
  dueDate?: string; // ISO
}

export interface TimelineEvent extends JsonRecord {
  id?: string;
  eventId?: string;
  timelineEventId?: string;
  projectId?: string;
  date?: string; // ISO YYYY-MM-DD
  description?: string;
  createdAt?: string;
  hours?: number | string;
  budgetItemId?: string | null;
  payload?: { description?: string } & JsonRecord;
}

export interface NotificationItem extends JsonRecord {
  userId: string;
  ['timestamp#uuid']: string;
  type?: string;
  message?: string;
  read?: boolean;
}

export interface Gallery extends JsonRecord {
  galleryId?: string;
  projectId: string;
  title?: string;
  slug?: string;
}

export interface BudgetHeader extends JsonRecord {
  budgetItemId: `HEADER-${string}`;
  projectId: string;
  budgetId?: string;
  revision?: number;
  clientRevisionId?: number | null;
}

export interface BudgetLine extends JsonRecord {
  budgetItemId: `LINE-${string}`;
  projectId: string;
  budgetId: string;
  revision?: number;
}

export type BudgetItem = BudgetHeader | BudgetLine;

export interface Invite extends JsonRecord {
  inviteId?: string;
  projectId?: string;
  recipientUsername?: string;
  status?: 'pending' | 'accepted' | 'declined' | 'canceled';
}

// Common API shapes
type MaybeItems<T> = { Items?: T[] } | T[];
type MaybeItem<T> = { Item?: T } | T;

// ───────────────────────────────────────────────────────────────────────────────
// Endpoints (env-overridable)
// ───────────────────────────────────────────────────────────────────────────────

const ENV = import.meta.env.VITE_APP_ENV || 'development';

const BASE_ENDPOINTS = {
  development: {
    API_BASE_URL: 'https://didaoiqxl5.execute-api.us-west-1.amazonaws.com/default',
    EDIT_PROJECT_URL: 'https://didaoiqxl5.execute-api.us-west-1.amazonaws.com/default/editProject',
    USER_PROFILES_API_URL: 'https://rvnpu2j92m.execute-api.us-west-1.amazonaws.com/default/userProfiles',
    USER_PROFILES_PENDING_API_URL: 'https://r1a9h607of.execute-api.us-west-1.amazonaws.com/default/userProfilesPending',
    USER_PROFILES_PENDING_API_KEY: '',
    REGISTERED_USER_TEAM_NOTIFICATION_API_URL: 'https://9aatm4ib0k.execute-api.us-west-1.amazonaws.com/default/RegisteredUserTeamNotification',
    WEBSOCKET_URL: 'wss://hly9zz2zci.execute-api.us-west-1.amazonaws.com/production/',
    NEWSLETTER_SUBSCRIBE_URL: 'https://jmmn5p5yhe.execute-api.us-west-1.amazonaws.com/default/notifyNewSubscriber',
    GET_INBOX_URL: 'https://gzpf6ukzqi.execute-api.us-west-1.amazonaws.com/default/getDmInbox',
    THREADS_URL: 'https://2h8m2hyu0e.execute-api.us-west-1.amazonaws.com/default/threads',
    GET_DM_MESSAGES_URL: 'https://tf8ei6sxuc.execute-api.us-west-1.amazonaws.com/default/getDirectMessages',
    DELETE_DM_MESSAGE_URL: 'https://tf8ei6sxuc.execute-api.us-west-1.amazonaws.com/default/getDirectMessages',
    DELETE_FILE_FROM_S3_URL: 'https://k6utve4soj.execute-api.us-west-1.amazonaws.com/default/DeleteFilesFromS3',
    READ_STATUS_URL: 'https://2h8m2hyu0e.execute-api.us-west-1.amazonaws.com/default/threads',
    ZIP_FILES_URL: 'https://o01t8q8mjk.execute-api.us-west-1.amazonaws.com/default/zipFiles',
    DELETE_PROJECT_MESSAGE_URL: 'https://4iokdw2tb0.execute-api.us-west-1.amazonaws.com/default/deleteProjectMessage',
    GET_PROJECT_MESSAGES_URL: 'https://njt9junfh8.execute-api.us-west-1.amazonaws.com/default/getProjectMessages',
    EDIT_PROJECT_MESSAGE_URL: 'https://fvtiz6xsr5.execute-api.us-west-1.amazonaws.com/prod/editMessage',
    EDIT_MESSAGE_URL: 'https://fvtiz6xsr5.execute-api.us-west-1.amazonaws.com/prod/editMessage',
    GALLERY_UPLOAD_URL: 'https://h6hfj178j1.execute-api.us-west-1.amazonaws.com/default/generatePresignedUrl',
    CREATE_GALLERY_FUNCTION_URL: 'https://2rv2kcbsf0.execute-api.us-west-1.amazonaws.com/default/CreateGalleryFunction',
    DELETE_GALLERY_FUNCTION_URL: 'https://xcneg1e558.execute-api.us-west-1.amazonaws.com/default/DeleteGalleryFunction',
    GALLERIES_API_URL: 'https://l6ltrk2jv6.execute-api.us-west-1.amazonaws.com/dev/galleries',
    POST_PROJECTS_URL: 'https://any6qedkud.execute-api.us-west-1.amazonaws.com/default/PostProjects',
    POST_PROJECT_TO_USER_URL: 'https://drgq4taueb.execute-api.us-west-1.amazonaws.com/default/postProjectToUserId',
    SEND_PROJECT_NOTIFICATION_URL: 'https://4hdwrz1ecb.execute-api.us-west-1.amazonaws.com/default/SendProjectNotification',
    PROJECTS_URL: 'https://gui4kdsekj.execute-api.us-west-1.amazonaws.com/default/Projects',
    EVENTS_URL: 'https://tqars05mcb.execute-api.us-west-1.amazonaws.com/dev/events',
    NOTIFICATIONS_URL: 'https://zwtzv1gx5m.execute-api.us-west-1.amazonaws.com/default/getNotifications',
    NOMINATIM_SEARCH_URL: 'https://nominatim.openstreetmap.org/search?format=json&q=',
    S3_PUBLIC_BASE: 'https://mylguserdata194416-dev.s3.us-west-1.amazonaws.com/public',
    BUDGETS_API_URL: 'https://ft892tjssf.execute-api.us-west-1.amazonaws.com/dev/budgets',
    PROJECT_INVITES_URL: 'https://nbucic0zgl.execute-api.us-west-1.amazonaws.com/Stage/sendProjectInvitation',
    COLLAB_INVITES_BASE_URL: 'https://mbl7rtpyr8.execute-api.us-west-1.amazonaws.com/invites',
    USER_INVITES_URL: 'https://example.com/user-invites',
    TASKS_API_URL: 'https://7kxhm2sgo8.execute-api.us-west-1.amazonaws.com/dev/tasks',
  },
  staging: {},
  production: {},
};

const defaults = (BASE_ENDPOINTS as Record<string, Record<string, string>>)[ENV] || BASE_ENDPOINTS.development;

export const API_ENDPOINTS: ApiEndpoints = Object.keys(BASE_ENDPOINTS.development).reduce<ApiEndpoints>(
  (acc, key) => {
    const envKey = `VITE_${key}` as keyof ImportMetaEnv;
    acc[key] = (import.meta.env as any)[envKey] || (defaults as any)[key];
    return acc;
  },
  {}
);

export const {
  API_BASE_URL,
  USER_PROFILES_API_URL,
  USER_PROFILES_PENDING_API_URL,
  USER_PROFILES_PENDING_API_KEY,
  REGISTERED_USER_TEAM_NOTIFICATION_API_URL,
  WEBSOCKET_URL,
  NEWSLETTER_SUBSCRIBE_URL,
  GET_INBOX_URL,
  THREADS_URL,
  GET_DM_MESSAGES_URL,
  DELETE_DM_MESSAGE_URL,
  DELETE_FILE_FROM_S3_URL,
  READ_STATUS_URL,
  ZIP_FILES_URL,
  DELETE_PROJECT_MESSAGE_URL,
  GET_PROJECT_MESSAGES_URL,
  EDIT_PROJECT_MESSAGE_URL,
  EDIT_MESSAGE_URL,
  GALLERY_UPLOAD_URL,
  CREATE_GALLERY_FUNCTION_URL,
  DELETE_GALLERY_FUNCTION_URL,
  GALLERIES_API_URL,
  POST_PROJECTS_URL,
  POST_PROJECT_TO_USER_URL,
  SEND_PROJECT_NOTIFICATION_URL,
  PROJECTS_URL,
  EDIT_PROJECT_URL,
  EVENTS_URL,
  NOTIFICATIONS_URL,
  NOMINATIM_SEARCH_URL,
  S3_PUBLIC_BASE,
  BUDGETS_API_URL,
  PROJECT_INVITES_URL,
  COLLAB_INVITES_BASE_URL,
  USER_INVITES_URL,
  TASKS_API_URL,
} = API_ENDPOINTS as Record<string, string>;

// ───────────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────────

/** Extracts array results from either `{ Items: T[] }` or `T[]`. */
function extractItems<T>(data: MaybeItems<T> | JsonRecord): T[] {
  if (Array.isArray(data)) return data as T[];
  if ('Items' in (data as any) && Array.isArray((data as any).Items)) return (data as any).Items as T[];
  return [];
}

/** Extracts single item from `{ Item: T }` or returns `null` if missing. */
function extractItem<T>(data: MaybeItem<T> | JsonRecord): T | null {
  if ('Item' in (data as any)) return ((data as any).Item ?? null) as T | null;
  return (data as T) ?? null;
}

const userProfilesCache = new Map<string, UserProfile>();

// ───────────────────────────────────────────────────────────────────────────────
// Core fetch with logging + retries + auth + CSRF + rate limiting
// ───────────────────────────────────────────────────────────────────────────────

export async function apiFetch<T = unknown>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const {
    retryCount = 3,
    retryDelay = 500,
    skipRateLimit = false,
    onNetworkError,
    ...fetchOptions
  } = options;

  // Rate limiting (per endpoint path)
  if (!skipRateLimit) {
    const rateLimitKey = `api_${new URL(url).pathname}`;
    if (!rateLimiter.isAllowed(rateLimitKey, 30, 60_000)) {
      const error = new Error('Rate limit exceeded. Please try again later.');
      logSecurityEvent('rate_limit_exceeded', { url, rateLimitKey });
      throw error;
    }
  }

  const token = await waitForAuthReady();

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
    Authorization: `Bearer ${token}`,
    'X-Requested-With': 'XMLHttpRequest',
  };

  if (fetchOptions.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(fetchOptions.method.toUpperCase())) {
    Object.assign(headers, csrfProtection.addToHeaders());
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      console.log(`[apiFetch] (${fetchOptions.method || 'GET'}) → ${url} (attempt ${attempt + 1}/${retryCount + 1})`);

      const res = await fetch(url, { ...fetchOptions, headers });

      if (res.status === 503 && attempt < retryCount) {
        console.warn('[apiFetch] 503 Service Unavailable — retrying after delay');
        await new Promise((r) => setTimeout(r, retryDelay));
        continue;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error(`[apiFetch] ❌ ${url} → ${res.status} ${res.statusText} — ${text}`);

        if (res.status === 401 || res.status === 403) {
          logSecurityEvent('authentication_error', { url, status: res.status, statusText: res.statusText });
        } else if (res.status === 429) {
          logSecurityEvent('server_rate_limit', { url, status: res.status });
        }

        throw new Error(`Request failed: ${res.status} ${res.statusText} - ${text}`);
      }

      const data = (await res.json()) as T;

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes((fetchOptions.method || '').toUpperCase())) {
        logSecurityEvent('api_state_change', { url: new URL(url).pathname, method: fetchOptions.method });
      }

      console.log('[apiFetch] ✅ Success:', { url, method: fetchOptions.method || 'GET' });
      return data;

    } catch (err) {
      lastError = err;
      if (attempt < retryCount) {
        console.warn('[apiFetch] Error, will retry:', (err as Error)?.message);
        await new Promise((r) => setTimeout(r, retryDelay));
      }
    }
  }

  if (lastError instanceof TypeError && /Failed to fetch/i.test((lastError as Error).message)) {
    const networkErr = new Error('Network request failed. Please check your connection and try again.');
    if (onNetworkError) onNetworkError(networkErr);
    lastError = networkErr;
  }

  console.error('[apiFetch] Final error:', lastError);
  logSecurityEvent('api_request_failed', { url: new URL(url).pathname, error: (lastError as Error).message });
  throw lastError;
}

// ───────────────────────────────────────────────────────────────────────────────
// Users
// ───────────────────────────────────────────────────────────────────────────────

export async function fetchAllUsers(): Promise<UserProfile[]> {
  const data = await apiFetch<MaybeItems<UserProfile>>(USER_PROFILES_API_URL);
  return extractItems<UserProfile>(data);
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const endpoint = `${USER_PROFILES_API_URL}?userId=${encodeURIComponent(userId)}`;
  const data = await apiFetch<MaybeItem<UserProfile>>(endpoint);
  return extractItem<UserProfile>(data);
}

// Batch with in-memory cache
export async function fetchUserProfilesBatch(userIds: string[] = []): Promise<UserProfile[]> {
  if (!Array.isArray(userIds) || userIds.length === 0) return [];

  const resultsMap = new Map<string, UserProfile>();
  const idsToFetch: string[] = [];

  for (const id of userIds) {
    const cached = userProfilesCache.get(id);
    if (cached) {
      resultsMap.set(id, cached);
    } else {
      idsToFetch.push(id);
    }
  }

  if (idsToFetch.length > 0) {
    const ids = encodeURIComponent(idsToFetch.join(','));
    const endpoint = `${USER_PROFILES_API_URL}?userIds=${ids}`;
    const data = await apiFetch<MaybeItems<UserProfile>>(endpoint);
    const fetched = extractItems<UserProfile>(data);
    for (const profile of fetched) {
      if (profile?.userId) {
        userProfilesCache.set(profile.userId, profile);
        resultsMap.set(profile.userId, profile);
      }
    }
  }

  return Array.from(resultsMap.values());
}

export function invalidateUserProfilesCache(userIds?: string | string[]): void {
  if (!userIds) {
    userProfilesCache.clear();
    return;
  }
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  ids.forEach((id) => userProfilesCache.delete(id));
}

export async function updateUserProfile(profile: UserProfile): Promise<UserProfile> {
  const data = await apiFetch<UserProfile>(USER_PROFILES_API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (profile.userId) userProfilesCache.set(profile.userId, data);
  return data;
}

export async function updateUserProfilePending(profile: UserProfile): Promise<UserProfile> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (USER_PROFILES_PENDING_API_KEY) headers['x-api-key'] = USER_PROFILES_PENDING_API_KEY;

  return apiFetch<UserProfile>(USER_PROFILES_PENDING_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(profile),
    // skipRateLimit? usually not necessary here
  });
}

export async function updateUserRole(userId: string, role: string): Promise<UserProfile> {
  const current = await fetchUserProfile(userId);
  if (!current) throw new Error(`User profile not found for ${userId}`);
  const nextRole = String(role).toLowerCase();
  return updateUserProfile({ ...current, role: nextRole });
}

// ───────────────────────────────────────────────────────────────────────────────
// Projects
// ───────────────────────────────────────────────────────────────────────────────

export async function fetchProjectsFromApi(): Promise<Project[]> {
  const data = await apiFetch<MaybeItems<Project>>(PROJECTS_URL);
  return extractItems<Project>(data);
}

export async function fetchProjectById(projectId: string): Promise<Project | null> {
  const url = `${PROJECTS_URL}?projectId=${encodeURIComponent(projectId)}`;
  const raw = await apiFetch<MaybeItems<Project> | MaybeItem<Project>>(url);

  if (Array.isArray(raw)) {
    return raw[0] ?? null;
  }
  if ('Items' in (raw as any) && Array.isArray((raw as any).Items)) {
    return ((raw as any).Items[0] ?? null) as Project | null;
  }
  return extractItem<Project>(raw as MaybeItem<Project>);
}

export async function updateProjectFields(projectId: string, fields: Partial<Project> & JsonRecord): Promise<Project> {
  const url = `${EDIT_PROJECT_URL}?projectId=${encodeURIComponent(projectId)}`;
  return apiFetch<Project>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
}

// ───────────────────────────────────────────────────────────────────────────────
// Tasks
// ───────────────────────────────────────────────────────────────────────────────

export async function fetchTasks(projectId?: string): Promise<Task[]> {
  const url = projectId ? `${TASKS_API_URL}?projectId=${encodeURIComponent(projectId)}` : TASKS_API_URL;
  const data = await apiFetch<MaybeItems<Task>>(url);
  return extractItems<Task>(data);
}

export async function createTask(task: Task): Promise<Task> {
  const payload = { ...task };
  if (payload.budgetItemId === '' || payload.budgetItemId == null) delete payload.budgetItemId;
  return apiFetch<Task>(TASKS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateTask(task: Task): Promise<Task> {
  const payload = { ...task };
  if (payload.budgetItemId === '' || payload.budgetItemId == null) delete payload.budgetItemId;
  return apiFetch<Task>(TASKS_API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteTask({ projectId, taskId }: { projectId: string; taskId: string }): Promise<{ ok: true }> {
  const url = `${TASKS_API_URL}?projectId=${encodeURIComponent(projectId)}&taskId=${encodeURIComponent(taskId)}`;
  await apiFetch<JsonRecord>(url, { method: 'DELETE' });
  return { ok: true };
}

// ───────────────────────────────────────────────────────────────────────────────
// Events / Timeline
// ───────────────────────────────────────────────────────────────────────────────

export async function fetchEvents(projectId: string): Promise<TimelineEvent[]> {
  const url = `${EVENTS_URL}?projectId=${encodeURIComponent(projectId)}`;
  const data = await apiFetch<MaybeItems<TimelineEvent> | { events?: TimelineEvent[] }>(url);

  const items = Array.isArray(data) ? data
    : ('Items' in (data as any) && Array.isArray((data as any).Items)) ? (data as any).Items
    : (data as any).events || [];

  return (items as TimelineEvent[]).map((ev) => {
    let date = ev.date;
    if (!date && ev.createdAt) {
      const match = String(ev.createdAt).match(/^\d{4}-\d{2}-\d{2}/);
      date = match ? match[0] : undefined;
    }
    return {
      ...ev,
      id: ev.id || ev.eventId || ev.timelineEventId,
      date,
      description: ev.description || ev.payload?.description || '',
    };
  });
}

export async function updateTimelineEvents(projectId: string, events: TimelineEvent[]): Promise<{ ok: true } & JsonRecord> {
  const url = `${EVENTS_URL}?projectId=${encodeURIComponent(projectId)}`;
  return apiFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events }),
  });
}

// Optional bulk assignment
export async function assignEventIdsBatch(projectIds: string[] = []): Promise<{ ok?: boolean } & JsonRecord> {
  const url = `${API_BASE_URL}/assignEventIdsBatch`;
  return apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectIds }),
  });
}

// ───────────────────────────────────────────────────────────────────────────────
// Galleries
// ───────────────────────────────────────────────────────────────────────────────

export async function fetchGalleries(projectId: string): Promise<Gallery[]> {
  if (!projectId) return [];
  const url = `${GALLERIES_API_URL}?projectId=${encodeURIComponent(projectId)}`;
  const data = await apiFetch<MaybeItems<Gallery>>(url);
  return extractItems<Gallery>(data);
}

export async function createGallery(projectId: string, gallery: Partial<Gallery>): Promise<Gallery> {
  return apiFetch<Gallery>(GALLERIES_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, ...gallery }),
  });
}

export async function updateGallery(galleryId: string, fields: Partial<Gallery>): Promise<Gallery> {
  return apiFetch<Gallery>(GALLERIES_API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ galleryId, ...fields }),
  });
}

export async function deleteGallery(galleryId: string, projectId?: string): Promise<{ ok: true }> {
  const params = new URLSearchParams({ galleryId });
  if (projectId) params.append('projectId', projectId);
  const url = `${GALLERIES_API_URL}?${params.toString()}`;
  await apiFetch<JsonRecord>(url, { method: 'DELETE' });
  return { ok: true };
}

export async function deleteGalleryFiles(projectId: string, galleryId?: string, gallerySlug?: string): Promise<{ ok?: boolean } & JsonRecord | void> {
  if (!projectId) return;
  const body: Record<string, unknown> = { projectId };
  if (galleryId) body.galleryId = galleryId;
  if (gallerySlug) body.gallerySlug = gallerySlug;

  return apiFetch(DELETE_GALLERY_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ───────────────────────────────────────────────────────────────────────────────
// Notifications
// ───────────────────────────────────────────────────────────────────────────────

export async function getNotifications(userId: string): Promise<NotificationItem[]> {
  if (!userId) return [];
  const url = `${NOTIFICATIONS_URL}?userId=${encodeURIComponent(userId)}`;
  console.log('📡 Fetching URL:', url);
  const data = await apiFetch<MaybeItems<NotificationItem>>(url);
  return extractItems<NotificationItem>(data);
}

export async function markNotificationRead(userId: string, timestampUuid: string): Promise<{ ok: true }> {
  if (!userId || !timestampUuid) return { ok: true };
  const params = new URLSearchParams({ userId, 'timestamp#uuid': timestampUuid });
  const url = `${NOTIFICATIONS_URL}?${params.toString()}`;
  await apiFetch<JsonRecord>(url, { method: 'PATCH' });
  return { ok: true };
}

export async function deleteNotification(userId: string, timestampUuid: string): Promise<{ ok: true }> {
  if (!userId || !timestampUuid) return { ok: true };
  const params = new URLSearchParams({ userId, 'timestamp#uuid': timestampUuid });
  const url = `${NOTIFICATIONS_URL}?${params.toString()}`;
  await apiFetch<JsonRecord>(url, { method: 'DELETE' });
  return { ok: true };
}

// ───────────────────────────────────────────────────────────────────────────────
// Budgets
// ───────────────────────────────────────────────────────────────────────────────

export async function fetchBudgetHeader(projectId: string): Promise<BudgetHeader | null> {
  if (!projectId) return null;
  const url = `${BUDGETS_API_URL}?projectId=${encodeURIComponent(projectId)}&headers=true`;
  const data = await apiFetch<MaybeItems<BudgetItem>>(url);
  const items = extractItems<BudgetItem>(data);

  const headers = items.filter(
    (item): item is BudgetHeader =>
      typeof item?.budgetItemId === 'string' && item.budgetItemId.startsWith('HEADER-')
  );

  if (headers.length === 0) return null;

  const clientHolder = headers.find((h) => h.clientRevisionId != null);
  if (clientHolder) {
    const target = headers.find((h) => (h.revision ?? 0) === clientHolder.clientRevisionId);
    if (target) return target;
  }

  headers.sort((a, b) => (b.revision ?? 0) - (a.revision ?? 0));
  return headers[0] ?? null;
}

export async function fetchBudgetHeaders(projectId: string): Promise<BudgetHeader[]> {
  if (!projectId) return [];
  const url = `${BUDGETS_API_URL}?projectId=${encodeURIComponent(projectId)}&headers=true`;
  const data = await apiFetch<MaybeItems<BudgetItem>>(url);
  const items = extractItems<BudgetItem>(data);

  const headers = items.filter(
    (item): item is BudgetHeader =>
      typeof item?.budgetItemId === 'string' && item.budgetItemId.startsWith('HEADER-')
  );

  const holder = headers.find((h) => h.clientRevisionId != null);
  if (holder) {
    headers.forEach((h) => {
      (h as any).clientRevisionId = holder.clientRevisionId;
    });
  }

  headers.sort((a, b) => (b.revision ?? 0) - (a.revision ?? 0));
  return headers;
}

export async function fetchBudgetItems(budgetId: string, revision?: number): Promise<BudgetLine[]> {
  const url = `${BUDGETS_API_URL}?budgetId=${encodeURIComponent(budgetId)}`;
  const data = await apiFetch<MaybeItems<BudgetItem>>(url);
  const items = extractItems<BudgetItem>(data);

  const lines = items.filter(
    (item): item is BudgetLine =>
      typeof item?.budgetItemId === 'string' && item.budgetItemId.startsWith('LINE-')
  );

  return revision != null ? lines.filter((it) => (it.revision ?? 0) === revision) : lines;
}

export async function createBudgetItem(
  projectId: string,
  budgetId: string,
  payload: Partial<BudgetLine | BudgetHeader>
): Promise<BudgetItem> {
  const body: any = { projectId, budgetId, ...payload };
  if (body.revision === undefined) body.revision = 1;

  return apiFetch<BudgetItem>(BUDGETS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function updateBudgetItem(
  projectId: string,
  budgetItemId: string,
  fields: Partial<BudgetItem>
): Promise<BudgetItem> {
  const body: any = { projectId, budgetItemId, ...fields };
  if (body.revision === undefined) body.revision = 1;

  return apiFetch<BudgetItem>(BUDGETS_API_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function deleteBudgetItem(projectId: string, budgetItemId: string): Promise<{ ok: true }> {
  if (!projectId || !budgetItemId) return { ok: true };
  const params = new URLSearchParams({ projectId, budgetItemId });
  const url = `${BUDGETS_API_URL}?${params.toString()}`;
  await apiFetch<JsonRecord>(url, { method: 'DELETE' });
  return { ok: true };
}

// ───────────────────────────────────────────────────────────────────────────────
// Project Invites
// ───────────────────────────────────────────────────────────────────────────────

export async function fetchPendingInvites(userId: string): Promise<Invite[]> {
  if (!userId) return [];
  const url = `${PROJECT_INVITES_URL}?userId=${encodeURIComponent(userId)}`;
  const data = await apiFetch<MaybeItems<Invite>>(url);
  return extractItems<Invite>(data);
}

export async function sendProjectInvite(projectId: string, recipientUsername: string): Promise<Invite> {
  return apiFetch<Invite>(PROJECT_INVITES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, recipientUsername }),
  });
}

export async function acceptProjectInvite(inviteId: string): Promise<{ ok: true }> {
  const params = new URLSearchParams({ inviteId, action: 'accept' });
  const url = `${PROJECT_INVITES_URL}?${params.toString()}`;
  await apiFetch<JsonRecord>(url, { method: 'PATCH' });
  return { ok: true };
}

export async function declineProjectInvite(inviteId: string): Promise<{ ok: true }> {
  const params = new URLSearchParams({ inviteId, action: 'decline' });
  const url = `${PROJECT_INVITES_URL}?${params.toString()}`;
  await apiFetch<JsonRecord>(url, { method: 'PATCH' });
  return { ok: true };
}

export async function cancelProjectInvite(inviteId: string): Promise<{ ok: true }> {
  const params = new URLSearchParams({ inviteId, action: 'cancel' });
  const url = `${PROJECT_INVITES_URL}?${params.toString()}`;
  await apiFetch<JsonRecord>(url, { method: 'PATCH' });
  return { ok: true };
}

// ───────────────────────────────────────────────────────────────────────────────
// Collaborator & User Invites
// ───────────────────────────────────────────────────────────────────────────────

export async function fetchOutgoingCollabInvites(): Promise<Invite[]> {
  const url = `${COLLAB_INVITES_BASE_URL}/outgoing`;
  const data = await apiFetch<MaybeItems<Invite>>(url);
  return extractItems<Invite>(data);
}

export async function fetchIncomingCollabInvites(): Promise<Invite[]> {
  const url = `${COLLAB_INVITES_BASE_URL}/incoming`;
  const data = await apiFetch<MaybeItems<Invite>>(url);
  return extractItems<Invite>(data);
}

export async function sendCollabInvite(toUserId: string, message = ''): Promise<Invite> {
  const url = `${COLLAB_INVITES_BASE_URL}/send`;
  return apiFetch<Invite>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toUserId, message }),
  });
}

export async function sendUserInvite(email: string, role: string): Promise<{ ok?: boolean } & JsonRecord> {
  const url = `${USER_INVITES_URL}/send`;
  return apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role }),
  });
}

export async function updateCollabInvite(inviteId: string, action: 'accept' | 'decline' | 'cancel'): Promise<Invite> {
  const url = `${COLLAB_INVITES_BASE_URL}/${action}/${inviteId}`;
  return apiFetch<Invite>(url, { method: 'POST' });
}

export const acceptCollabInvite = (inviteId: string) => updateCollabInvite(inviteId, 'accept');
export const declineCollabInvite = (inviteId: string) => updateCollabInvite(inviteId, 'decline');
export const cancelCollabInvite  = (inviteId: string) => updateCollabInvite(inviteId, 'cancel');
