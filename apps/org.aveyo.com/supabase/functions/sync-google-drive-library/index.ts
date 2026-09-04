/**
 * Synchronizes employee-facing document libraries from Google Drive metadata.
 * Google Drive remains the source of truth; no document content is copied.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GOOGLE_CREDENTIALS_BASE64 = Deno.env.get('GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_BASE64')

const GOOGLE_DRIVE_READONLY_SCOPE = 'https://www.googleapis.com/auth/drive.metadata.readonly'
const GOOGLE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'
const MAX_DRIVE_ITEMS = 5_000
const MAX_FOLDER_DEPTH = 20

const librarySources = {
  field_safety_protocol: {
    rootFolderId: '0AL9aC8VhjHqhUk9PVA',
  },
} as const

type LibrarySourceKey = keyof typeof librarySources

interface ServiceAccountCredentials {
  client_email: string
  private_key: string
  private_key_id?: string
  token_uri?: string
}

interface RequesterProfile {
  id: string
  department_id: string | null
  employment_status: string | null
  onboarding_completed: boolean | null
  is_admin: boolean | null
  is_manager: boolean | null
  is_super_admin: boolean | null
}

interface DriveFile {
  id: string
  name: string
  mimeType: string
  description?: string
  webViewLink?: string
}

interface DriveFileListResponse {
  nextPageToken?: string
  files?: DriveFile[]
  error?: {
    code?: number
    message?: string
  }
}

interface MirroredFolder {
  driveItemId: string
  parentDriveItemId: string | null
  name: string
  driveUrl: string
  sortOrder: number
  depth: number
}

interface MirroredDocument {
  driveItemId: string
  parentDriveItemId: string | null
  title: string
  description: string
  url: string
  sortOrder: number
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization') ?? ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  const token = authHeader.slice('bearer '.length).trim()
  return token || null
}

function base64UrlEncode(value: string | Uint8Array): string {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function parseServiceAccountCredentials(): ServiceAccountCredentials {
  if (!GOOGLE_CREDENTIALS_BASE64) {
    throw new Error('Google Drive credentials are not configured.')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(atob(GOOGLE_CREDENTIALS_BASE64))
  } catch {
    throw new Error('Google Drive credentials are invalid.')
  }

  const credentials = parsed as Partial<ServiceAccountCredentials>
  if (
    typeof credentials.client_email !== 'string'
    || !credentials.client_email.endsWith('.iam.gserviceaccount.com')
    || typeof credentials.private_key !== 'string'
    || !credentials.private_key.includes('BEGIN PRIVATE KEY')
  ) {
    throw new Error('Google Drive credentials are invalid.')
  }

  return credentials as ServiceAccountCredentials
}

async function getGoogleAccessToken(credentials: ServiceAccountCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1_000)
  const tokenUri = credentials.token_uri || 'https://oauth2.googleapis.com/token'
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    ...(credentials.private_key_id ? { kid: credentials.private_key_id } : {}),
  }
  const claims = {
    iss: credentials.client_email,
    scope: GOOGLE_DRIVE_READONLY_SCOPE,
    aud: tokenUri,
    iat: now - 5,
    exp: now + 3_600,
  }

  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`
  const pemBody = credentials.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const keyBytes = Uint8Array.from(atob(pemBody), (character) => character.charCodeAt(0))
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(unsignedToken),
  )
  const assertion = `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`

  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  const payload = await response.json() as { access_token?: string; error_description?: string }

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || 'Google authentication failed.')
  }

  return payload.access_token
}

async function listFolderChildren(
  accessToken: string,
  sharedDriveId: string,
  parentId: string,
): Promise<DriveFile[]> {
  const files: DriveFile[] = []
  let pageToken: string | undefined

  do {
    const query = new URLSearchParams({
      q: `'${parentId}' in parents and trashed = false`,
      corpora: 'drive',
      driveId: sharedDriveId,
      includeItemsFromAllDrives: 'true',
      supportsAllDrives: 'true',
      spaces: 'drive',
      orderBy: 'folder,name_natural',
      pageSize: '1000',
      fields: 'nextPageToken,files(id,name,mimeType,description,webViewLink)',
    })
    if (pageToken) query.set('pageToken', pageToken)

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${query}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const payload = await response.json() as DriveFileListResponse

    if (!response.ok) {
      const error = new Error(payload.error?.message || 'Google Drive could not list the folder.')
      Object.assign(error, { driveStatus: response.status })
      throw error
    }

    files.push(...(payload.files ?? []))
    if (files.length > MAX_DRIVE_ITEMS) {
      throw new Error(`Drive library exceeds the ${MAX_DRIVE_ITEMS.toLocaleString()} item safety limit.`)
    }
    pageToken = payload.nextPageToken
  } while (pageToken)

  return files
}

async function assertDriveRootAccess(accessToken: string, rootFolderId: string): Promise<void> {
  const query = new URLSearchParams({
    supportsAllDrives: 'true',
    fields: 'id,mimeType',
  })
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(rootFolderId)}?${query}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  const payload = await response.json() as DriveFileListResponse & Partial<DriveFile>

  if (!response.ok) {
    const error = new Error(payload.error?.message || 'Google Drive could not access the library root.')
    Object.assign(error, { driveStatus: response.status })
    throw error
  }

  if (payload.id !== rootFolderId || payload.mimeType !== GOOGLE_FOLDER_MIME_TYPE) {
    throw new Error('The configured Google Drive library root is not a folder.')
  }
}

function fallbackDriveUrl(file: DriveFile): string {
  if (file.mimeType === GOOGLE_FOLDER_MIME_TYPE) {
    return `https://drive.google.com/drive/folders/${file.id}`
  }
  return `https://drive.google.com/file/d/${file.id}/view`
}

async function readDriveHierarchy(
  accessToken: string,
  rootFolderId: string,
): Promise<{ folders: MirroredFolder[]; documents: MirroredDocument[] }> {
  const folders: MirroredFolder[] = []
  const documents: MirroredDocument[] = []
  const visitedFolderIds = new Set([rootFolderId])
  const queue: Array<{ id: string; parentDriveItemId: string | null; depth: number }> = [
    { id: rootFolderId, parentDriveItemId: null, depth: 0 },
  ]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current.depth > MAX_FOLDER_DEPTH) {
      throw new Error(`Drive library exceeds the ${MAX_FOLDER_DEPTH}-level folder safety limit.`)
    }

    const children = await listFolderChildren(accessToken, rootFolderId, current.id)
    const childFolders = children.filter((file) => file.mimeType === GOOGLE_FOLDER_MIME_TYPE)
    const childDocuments = children.filter((file) => file.mimeType !== GOOGLE_FOLDER_MIME_TYPE)

    childFolders.forEach((folder, index) => {
      if (visitedFolderIds.has(folder.id)) return
      visitedFolderIds.add(folder.id)
      folders.push({
        driveItemId: folder.id,
        parentDriveItemId: current.parentDriveItemId,
        name: folder.name,
        driveUrl: folder.webViewLink || fallbackDriveUrl(folder),
        sortOrder: index,
        depth: current.depth,
      })
      queue.push({
        id: folder.id,
        parentDriveItemId: folder.id,
        depth: current.depth + 1,
      })
    })

    childDocuments.forEach((document, index) => {
      documents.push({
        driveItemId: document.id,
        parentDriveItemId: current.parentDriveItemId,
        title: document.name,
        description: document.description?.trim() || '',
        url: document.webViewLink || fallbackDriveUrl(document),
        sortOrder: index,
      })
    })

    if (folders.length + documents.length > MAX_DRIVE_ITEMS) {
      throw new Error(`Drive library exceeds the ${MAX_DRIVE_ITEMS.toLocaleString()} item safety limit.`)
    }
  }

  return { folders, documents }
}

async function deleteRowsInChunks(
  supabaseAdmin: ReturnType<typeof createClient>,
  table: 'field_safety_documents' | 'field_safety_folders',
  ids: string[],
) {
  for (let index = 0; index < ids.length; index += 500) {
    const { error } = await supabaseAdmin.from(table).delete().in('id', ids.slice(index, index + 500))
    if (error) throw error
  }
}

async function syncFieldSafetyLibrary(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  folders: MirroredFolder[],
  documents: MirroredDocument[],
) {
  const { data: existingFolders, error: existingFoldersError } = await supabaseAdmin
    .from('field_safety_folders')
    .select('id, drive_item_id')
  if (existingFoldersError) throw existingFoldersError

  const { data: existingDocuments, error: existingDocumentsError } = await supabaseAdmin
    .from('field_safety_documents')
    .select('id, drive_item_id')
  if (existingDocumentsError) throw existingDocumentsError

  const folderIdByDriveId = new Map<string, string>()
  const depthLevels = [...new Set(folders.map((folder) => folder.depth))].sort((a, b) => a - b)

  for (const depth of depthLevels) {
    const rows = folders
      .filter((folder) => folder.depth === depth)
      .map((folder) => ({
        drive_item_id: folder.driveItemId,
        parent_folder_id: folder.parentDriveItemId
          ? folderIdByDriveId.get(folder.parentDriveItemId) ?? null
          : null,
        name: folder.name,
        drive_url: folder.driveUrl,
        sort_order: folder.sortOrder,
        updated_by: userId,
      }))

    if (rows.length === 0) continue
    const { data, error } = await supabaseAdmin
      .from('field_safety_folders')
      .upsert(rows, { onConflict: 'drive_item_id' })
      .select('id, drive_item_id')
    if (error) throw error
    for (const row of data ?? []) {
      if (row.drive_item_id) folderIdByDriveId.set(row.drive_item_id, row.id)
    }
  }

  for (let index = 0; index < documents.length; index += 500) {
    const rows = documents.slice(index, index + 500).map((document) => ({
      drive_item_id: document.driveItemId,
      folder_id: document.parentDriveItemId
        ? folderIdByDriveId.get(document.parentDriveItemId) ?? null
        : null,
      title: document.title,
      description: document.description,
      url: document.url,
      sort_order: document.sortOrder,
      updated_by: userId,
    }))
    const { error } = await supabaseAdmin
      .from('field_safety_documents')
      .upsert(rows, { onConflict: 'drive_item_id' })
    if (error) throw error
  }

  const driveFolderIds = new Set(folders.map((folder) => folder.driveItemId))
  const driveDocumentIds = new Set(documents.map((document) => document.driveItemId))
  const staleDocumentIds = (existingDocuments ?? [])
    .filter((row) => !row.drive_item_id || !driveDocumentIds.has(row.drive_item_id))
    .map((row) => row.id)
  const staleFolderIds = (existingFolders ?? [])
    .filter((row) => !row.drive_item_id || !driveFolderIds.has(row.drive_item_id))
    .map((row) => row.id)

  await deleteRowsInChunks(supabaseAdmin, 'field_safety_documents', staleDocumentIds)
  await deleteRowsInChunks(supabaseAdmin, 'field_safety_folders', staleFolderIds)

  return {
    folderCount: folders.length,
    documentCount: documents.length,
    removedCount: staleFolderIds.length + staleDocumentIds.length,
  }
}

serve(async (req) => {
  const requestId = crypto.randomUUID()

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED', requestId }, 405)
  }

  try {
    const accessToken = getBearerToken(req)
    if (!accessToken) {
      return jsonResponse({ error: 'Sign in is required.', code: 'INVALID_JWT', requestId }, 401)
    }

    const body = await req.json().catch(() => null) as { source?: string } | null
    const sourceKey = body?.source as LibrarySourceKey | undefined
    if (!sourceKey || !(sourceKey in librarySources)) {
      return jsonResponse({ error: 'Unknown Drive library.', code: 'UNKNOWN_SOURCE', requestId }, 400)
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken)
    if (authError || !authData.user) {
      return jsonResponse({ error: 'Sign in is required.', code: 'INVALID_JWT', requestId }, 401)
    }

    const userId = authData.user.id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, department_id, employment_status, onboarding_completed, is_admin, is_manager, is_super_admin')
      .eq('id', userId)
      .single<RequesterProfile>()
    if (profileError || !profile) {
      return jsonResponse({ error: 'Your employee profile could not be verified.', code: 'PROFILE_REQUIRED', requestId }, 403)
    }

    let departmentName = ''
    if (profile.department_id) {
      const { data: department } = await supabaseAdmin
        .from('departments')
        .select('name')
        .eq('id', profile.department_id)
        .maybeSingle()
      departmentName = department?.name?.trim().toLowerCase() ?? ''
    }

    const isActive = (profile.employment_status ?? 'active') === 'active'
    const isOnboarded = profile.onboarding_completed === true
    const canRefresh = Boolean(
      isActive
      && isOnboarded
      && (
        profile.is_admin
        || profile.is_super_admin
        || (profile.is_manager && departmentName === 'operations')
      )
    )
    if (!canRefresh) {
      return jsonResponse({ error: 'Operations Manager or admin access is required.', code: 'AUTHZ_ROLE_DENIED', requestId }, 403)
    }

    const credentials = parseServiceAccountCredentials()
    const googleAccessToken = await getGoogleAccessToken(credentials)
    const source = librarySources[sourceKey]
    await assertDriveRootAccess(googleAccessToken, source.rootFolderId)
    const hierarchy = await readDriveHierarchy(googleAccessToken, source.rootFolderId)
    const result = await syncFieldSafetyLibrary(
      supabaseAdmin,
      userId,
      hierarchy.folders,
      hierarchy.documents,
    )

    console.log(JSON.stringify({ event: 'drive_library_sync_success', requestId, sourceKey, userId, ...result }))
    return jsonResponse({ success: true, source: sourceKey, syncedAt: new Date().toISOString(), ...result })
  } catch (error) {
    const driveStatus = typeof error === 'object' && error && 'driveStatus' in error
      ? Number((error as { driveStatus?: number }).driveStatus)
      : null
    const isDriveAccessError = driveStatus === 403 || driveStatus === 404
    const message = error instanceof Error ? error.message : 'Drive synchronization failed.'
    console.error(JSON.stringify({ event: 'drive_library_sync_failed', requestId, driveStatus, message }))

    return jsonResponse(
      {
        error: isDriveAccessError
          ? 'The Drive sync account does not have access to this Shared Drive yet.'
          : message,
        code: isDriveAccessError ? 'DRIVE_ACCESS_REQUIRED' : 'SYNC_FAILED',
        requestId,
      },
      isDriveAccessError ? 403 : 500,
    )
  }
})
