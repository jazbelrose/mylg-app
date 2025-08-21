import { waitForAuthReady } from './waitForAuthReady';
import { csrfProtection, rateLimiter, logSecurityEvent } from './securityUtils';

// Type definitions
interface ApiEndpoints {
  [key: string]: string;
}

interface ApiFetchOptions extends RequestInit {
  retryCount?: number;
  retryDelay?: number;
  skipRateLimit?: boolean;
  onNetworkError?: (error: Error) => void;
}

const userProfilesCache = new Map();
// Consolidated list of endpoints. Values can be overridden via environment variables

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
  production: {}
};

const defaults = BASE_ENDPOINTS[ENV] || BASE_ENDPOINTS.development;

export const API_ENDPOINTS: ApiEndpoints = Object.keys(BASE_ENDPOINTS.development).reduce(
  (acc: ApiEndpoints, key) => {
    const envKey = `VITE_${key}`;
    acc[key] = import.meta.env[envKey] || defaults[key];
    return acc;
  },
  {} as ApiEndpoints
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
  } = API_ENDPOINTS;


/**
 * Wrapper around fetch that attaches the current user's access token if
 * available and throws for non-OK responses.
 */
export async function apiFetch(url: string, options: ApiFetchOptions = {}) {
  const {
    retryCount = 3,
    retryDelay = 500,
    skipRateLimit = false,
    onNetworkError,
    ...fetchOptions
  } = options;
  
  
  // Rate limiting check (unless explicitly skipped)
  if (!skipRateLimit) {
    const rateLimitKey = `api_${new URL(url).pathname}`;
    if (!rateLimiter.isAllowed(rateLimitKey, 30, 60000)) { // 30 requests per minute per endpoint
      const error = new Error('Rate limit exceeded. Please try again later.');
      logSecurityEvent('rate_limit_exceeded', { url, rateLimitKey });
      throw error;
    }
  }
  
  const token = await waitForAuthReady();
  const headers = {
    ...(fetchOptions.headers || {}),
    Authorization: `Bearer ${token}`, // <-- Add Bearer prefix here!
    'X-Requested-With': 'XMLHttpRequest', // CSRF protection
  };
  
  // Add CSRF token for state-changing operations
  if (fetchOptions.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(fetchOptions.method.toUpperCase())) {
    Object.assign(headers, csrfProtection.addToHeaders());
  }

  let lastError;
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const res = await fetch(url, { ...fetchOptions, headers });

      if (res.status === 503 && attempt < retryCount) {
        // Service unavailable - retry after a short delay
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        const error = new Error(`Request failed: ${res.status} ${res.statusText} - ${text}`);
        
        // Log security-relevant errors
        if (res.status === 401 || res.status === 403) {
          logSecurityEvent('authentication_error', { 
            url, 
            status: res.status, 
            statusText: res.statusText 
          });
        } else if (res.status === 429) {
          logSecurityEvent('server_rate_limit', { 
            url, 
            status: res.status 
          });
        }
        
        throw error;
      }

      // Log successful requests for sensitive operations
      if (fetchOptions.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(fetchOptions.method.toUpperCase())) {
        logSecurityEvent('api_state_change', { 
          url: new URL(url).pathname, 
          method: fetchOptions.method 
        });
      }

      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retryCount) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  if (lastError instanceof TypeError && /Failed to fetch/i.test(lastError.message)) {
    lastError = new Error('Network request failed. Please check your connection and try again.');
    if (onNetworkError) {
      onNetworkError(lastError);
    }
  }

  console.error('apiFetch error:', lastError);
  logSecurityEvent('api_request_failed', {
    url: new URL(url).pathname,
    error: lastError.message
  });
  throw lastError;
}

export async function fetchAllUsers() {
  const response = await apiFetch(USER_PROFILES_API_URL);
  const data = await response.json();
  return data.Items || [];
}

export async function fetchUserProfile(userId) {
  const endpoint = `${USER_PROFILES_API_URL}?userId=${userId}`;
  const response = await apiFetch(endpoint);
  const data = await response.json();
  return data?.Item ?? null;
}

// Fetch multiple user profiles in a single request with caching.
// Profiles are cached in-memory by userId to avoid redundant network calls.
export async function fetchUserProfilesBatch(userIds = []) {
  if (!Array.isArray(userIds) || userIds.length === 0) return [];

  const resultsMap = new Map();
  const idsToFetch = [];

  for (const id of userIds) {
    if (userProfilesCache.has(id)) {
      resultsMap.set(id, userProfilesCache.get(id));
    } else {
      idsToFetch.push(id);
    }
  }

  if (idsToFetch.length > 0) {
    const ids = encodeURIComponent(idsToFetch.join(','));
    const endpoint = `${USER_PROFILES_API_URL}?userIds=${ids}`;
    const response = await apiFetch(endpoint);
    const data = await response.json();
    const fetched = data.Items || [];

    fetched.forEach((profile) => {
      if (profile && profile.userId) {
        userProfilesCache.set(profile.userId, profile);
        resultsMap.set(profile.userId, profile);
      }
    });
  }

  return Array.from(resultsMap.values());
}

// Allow manual cache invalidation for specified userIds or all cached profiles
export function invalidateUserProfilesCache(userIds) {
  if (!userIds) {
    userProfilesCache.clear();
    return;
  }
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  ids.forEach((id) => userProfilesCache.delete(id));
}
export async function updateUserProfile(profile) {
  const res = await apiFetch(USER_PROFILES_API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  });
  if (!res.ok) {
    throw new Error(`Failed to update profile: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function updateUserProfilePending(profile) {
  const headers = { 'Content-Type': 'application/json' };
  if (USER_PROFILES_PENDING_API_KEY) {
    headers['x-api-key'] = USER_PROFILES_PENDING_API_KEY;
  }
  const res = await fetch(USER_PROFILES_PENDING_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    throw new Error(`Failed to update pending profile: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function updateUserRole(userId, role) {
  const res = await fetchUserProfile(userId);
  const currentProfile = res?.Item ?? res;  // unwrap if needed

  if (!currentProfile) {
    throw new Error(`User profile not found for ${userId}`);
  }

  const nextRole = String(role).toLowerCase();
  return updateUserProfile({ ...currentProfile, role: nextRole });
}

/**
 * Fetch the list of all projects.
 */
export async function fetchProjectsFromApi() {
  const res = await apiFetch(PROJECTS_URL);
  if (!res.ok) throw new Error(`Failed to fetch projects: ${res.statusText}`);
  const data = await res.json();
  // your API may wrap items in .Items; adjust as needed
  return Array.isArray(data) ? data : data.Items || [];
}

/**
 * Fetch a single project by ID.
 */
export async function fetchProjectById(projectId) {
  const url = `${PROJECTS_URL}?projectId=${encodeURIComponent(projectId)}`;
  const res = await apiFetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch project: ${res.statusText}`);
  }
  const data = await res.json();
  if (Array.isArray(data?.Items)) {
    return data.Items[0];
  }
  if (Array.isArray(data)) {
    return data[0];
  }
  return data?.Item || data;
}

// --- Tasks ---

/**
 * Fetch tasks for a given project.
 */
export async function fetchTasks(projectId) {
  const url = projectId
    ? `${TASKS_API_URL}?projectId=${encodeURIComponent(projectId)}`
    : TASKS_API_URL;
  const res = await apiFetch(url);
  const data = await res.json();
  return Array.isArray(data) ? data : data.Items || [];
}

export async function createTask(task) {
  const payload = { ...task };
  if (payload.budgetItemId === '' || payload.budgetItemId === null) {
    delete payload.budgetItemId;
  }
  const res = await apiFetch(TASKS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to create task: ${res.statusText}`);
  }
  return res.json();
}

export async function updateTask(task) {
  const payload = { ...task };
  if (payload.budgetItemId === '' || payload.budgetItemId === null) {
    delete payload.budgetItemId;
  }
  const res = await apiFetch(TASKS_API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to update task: ${res.statusText}`);
  }
  return res.json();
}

export async function deleteTask({ projectId, taskId }) {
  const url = `${TASKS_API_URL}?projectId=${encodeURIComponent(projectId)}&taskId=${encodeURIComponent(taskId)}`;
  const res = await apiFetch(url, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete task: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch events for a project from the Events table.
 */
export async function fetchEvents(projectId) {
  const url = `${EVENTS_URL}?projectId=${encodeURIComponent(projectId)}`;
  const res = await apiFetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch events: ${res.statusText}`);
  }
  const data = await res.json();
  const items = Array.isArray(data)
    ? data
    : data.Items || data.events || [];
  return items.map((ev) => {
    // Ensure every event has a valid date and description
    let date = ev.date;
    if (!date && ev.createdAt) {
      // Try to extract YYYY-MM-DD from createdAt
      const match = String(ev.createdAt).match(/^\d{4}-\d{2}-\d{2}/);
      date = match ? match[0] : undefined;
    }
    return {
      ...ev,
      id: ev.id || ev.eventId || ev.timelineEventId,
      date,
      description: ev.description || (ev.payload && ev.payload.description) || '',
    };
  });
}

/**
 * Update the events for a single project.
 */
export async function updateTimelineEvents(projectId, events) {
  const url = `${EVENTS_URL}?projectId=${encodeURIComponent(projectId)}`;
  const res = await apiFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update timeline events: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Generic helper to update arbitrary fields for a project.
 * Accepts an object of fields which will be merged server-side.
 */
export async function updateProjectFields(projectId, fields) {
  const url = `${EDIT_PROJECT_URL}?projectId=${encodeURIComponent(projectId)}`;
  const res = await apiFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    throw new Error(`Failed to update project fields: ${res.statusText}`);
  }
  return res.json();
}

// Optional bulk assignment of event ids for multiple projects
export async function assignEventIdsBatch(projectIds = []) {
  const url = `${API_BASE_URL}/assignEventIdsBatch`;
  const res = await apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectIds }),
  });
  if (!res.ok) {
    throw new Error(`Failed to assign event ids: ${res.statusText}`);
  }
  return res.json();
}



// --- Galleries CRUD ---
export async function fetchGalleries(projectId) {
  if (!projectId) return [];
  const url = `${GALLERIES_API_URL}?projectId=${encodeURIComponent(projectId)}`;
  const res = await apiFetch(url);
  const data = await res.json();
  return Array.isArray(data) ? data : data.Items || [];
}

export async function createGallery(projectId, gallery) {
  const res = await apiFetch(GALLERIES_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, ...gallery }),
  });
  if (!res.ok) throw new Error(`Failed to create gallery: ${res.statusText}`);
  return res.json();
}

export async function updateGallery(galleryId, fields) {
  const res = await apiFetch(GALLERIES_API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ galleryId, ...fields }),
  });
  if (!res.ok) throw new Error(`Failed to update gallery: ${res.statusText}`);
  return res.json();
}

export async function deleteGallery(galleryId, projectId) {
  const params = new URLSearchParams({ galleryId });
  if (projectId) {
    params.append('projectId', projectId);
  }
  const url = `${GALLERIES_API_URL}?${params.toString()}`;
  await apiFetch(url, { method: 'DELETE' });
}

export async function deleteGalleryFiles(projectId: string, galleryId?: string, gallerySlug?: string) {
  if (!projectId) return;
  const body: any = { projectId };
  if (galleryId) body.galleryId = galleryId;
  if (gallerySlug) body.gallerySlug = gallerySlug;
  const res = await apiFetch(DELETE_GALLERY_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Failed to delete gallery files: ${res.statusText}`);
  }
  return res.json();
}

// --- Notifications ---
export async function getNotifications(userId) {
  if (!userId) return [];
  
  const url = `${NOTIFICATIONS_URL}?userId=${encodeURIComponent(userId)}`;
  console.log('📡 Fetching URL:', url); // <-- Move here

  const res = await apiFetch(url);
  const data = await res.json();
  return Array.isArray(data) ? data : data.Items || [];
}

export async function markNotificationRead(userId, timestampUuid) {
  if (!userId || !timestampUuid) return;
  const params = new URLSearchParams({
    userId,
    'timestamp#uuid': timestampUuid,
  });
  const url = `${NOTIFICATIONS_URL}?${params}`;
  await apiFetch(url, { method: 'PATCH' });
}

export async function deleteNotification(userId, timestampUuid) {
  if (!userId || !timestampUuid) return;
  const params = new URLSearchParams({
    userId,
    'timestamp#uuid': timestampUuid,
  });
  const url = `${NOTIFICATIONS_URL}?${params}`;
  await apiFetch(url, { method: 'DELETE' });
}

// --- Budgets ---
export async function fetchBudgetHeader(projectId) {
  if (!projectId) return null;

  const url = `${BUDGETS_API_URL}?projectId=${encodeURIComponent(
    projectId
  )}&headers=true`;
  const res = await apiFetch(url);
  const data = await res.json();

  const items = Array.isArray(data) ? data : data.Items || [];
  const headers = items.filter(
    (item) => item.budgetItemId && item.budgetItemId.startsWith('HEADER-')
  );
  if (headers.length === 0) return null;
  const clientHolder = headers.find((h) => h.clientRevisionId != null);
  if (clientHolder) {
    const target = headers.find((h) => h.revision === clientHolder.clientRevisionId);
    if (target) return target;
  }
  headers.sort((a, b) => (b.revision || 0) - (a.revision || 0));
  return headers[0];
}

export async function fetchBudgetHeaders(projectId) {
  if (!projectId) return [];

  const url = `${BUDGETS_API_URL}?projectId=${encodeURIComponent(
    projectId
  )}&headers=true`;
  const res = await apiFetch(url);
  const data = await res.json();

  const items = Array.isArray(data) ? data : data.Items || [];
  const headers = items.filter(
    (item) => item.budgetItemId && item.budgetItemId.startsWith('HEADER-')
  );
  const holder = headers.find((h) => h.clientRevisionId != null);
  if (holder) {
    headers.forEach((h) => {
      h.clientRevisionId = holder.clientRevisionId;
    });
  }
  headers.sort((a, b) => (b.revision || 0) - (a.revision || 0));
  return headers;
}
export async function fetchBudgetItems(budgetId, revision) {
  const url = `${BUDGETS_API_URL}?budgetId=${encodeURIComponent(budgetId)}`;
  const res = await apiFetch(url);
  const data = await res.json();
  const items = Array.isArray(data) ? data : data.Items || [];
  const lines = items.filter(
    (item) => item.budgetItemId && item.budgetItemId.startsWith('LINE-')
  );
  return revision != null ? lines.filter((it) => it.revision === revision) : lines;
}


export async function createBudgetItem(projectId, budgetId, data) {
  const url = `${BUDGETS_API_URL}`;
  const body = { projectId, budgetId, ...data };
  if (body.revision === undefined) body.revision = 1;
  const res = await apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to create budget item: ${res.statusText}`);
  return res.json();
}

export async function updateBudgetItem(projectId, budgetItemId, fields) {
  const url = `${BUDGETS_API_URL}`;
  const body = { projectId, budgetItemId, ...fields };
  if (body.revision === undefined) body.revision = 1;
  const res = await apiFetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to update budget item: ${res.statusText}`);
  return res.json();
}

export async function deleteBudgetItem(projectId, budgetItemId) {
  if (!projectId || !budgetItemId) return;
  const params = new URLSearchParams({ projectId, budgetItemId });
  const url = `${BUDGETS_API_URL}?${params.toString()}`;
  await apiFetch(url, { method: 'DELETE' });
}

// --- Project Invites ---
export async function fetchPendingInvites(userId) {
  if (!userId) return [];
  const url = `${PROJECT_INVITES_URL}?userId=${encodeURIComponent(userId)}`;
  const res = await apiFetch(url);
  const data = await res.json();
  return Array.isArray(data) ? data : data.Items || [];
}

export async function sendProjectInvite(projectId, recipientUsername) {
  const res = await apiFetch(PROJECT_INVITES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, recipientUsername }),
  });
  if (!res.ok) throw new Error(`Failed to send invite: ${res.statusText}`);
  return res.json();
}

export async function acceptProjectInvite(inviteId) {
  const params = new URLSearchParams({ inviteId, action: 'accept' });
  const url = `${PROJECT_INVITES_URL}?${params.toString()}`;
  await apiFetch(url, { method: 'PATCH' });
}

export async function declineProjectInvite(inviteId) {
  const params = new URLSearchParams({ inviteId, action: 'decline' });
  const url = `${PROJECT_INVITES_URL}?${params.toString()}`;
  await apiFetch(url, { method: 'PATCH' });
}

export async function cancelProjectInvite(inviteId) {
  const params = new URLSearchParams({ inviteId, action: 'cancel' });
  const url = `${PROJECT_INVITES_URL}?${params.toString()}`;
  await apiFetch(url, { method: 'PATCH' });
}

// --- Collaborator Invites ---
export async function fetchOutgoingCollabInvites() {
  const url = `${COLLAB_INVITES_BASE_URL}/outgoing`;
  const res = await apiFetch(url);
  const data = await res.json();
  return Array.isArray(data) ? data : data.Items || [];
}

export async function fetchIncomingCollabInvites() {
  const url = `${COLLAB_INVITES_BASE_URL}/incoming`;
  const res = await apiFetch(url);
  const data = await res.json();
  return Array.isArray(data) ? data : data.Items || [];
}

export async function sendCollabInvite(toUserId, message = '') {
  const url = `${COLLAB_INVITES_BASE_URL}/send`;
  const res = await apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toUserId, message }),
  });
  if (!res.ok) throw new Error(`Failed to send invite: ${res.statusText}`);
  return res.json();
}

export async function sendUserInvite(email, role) {
  const url = `${USER_INVITES_URL}/send`;
  const res = await apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role }),
  });
  if (!res.ok) throw new Error(`Failed to send invite: ${res.statusText}`);
  return res.json();
}

export async function updateCollabInvite(inviteId, action) {
  const url = `${COLLAB_INVITES_BASE_URL}/${action}/${inviteId}`;
  const res = await apiFetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to ${action} invite: ${res.statusText}`);
  return res.json();
}

export const acceptCollabInvite = (inviteId) => updateCollabInvite(inviteId, 'accept');
export const declineCollabInvite = (inviteId) => updateCollabInvite(inviteId, 'decline');
export const cancelCollabInvite = (inviteId) => updateCollabInvite(inviteId, 'cancel');

