export const FIELD_SAFETY_ROOT_DRIVE_URL =
  'https://drive.google.com/drive/folders/0AL9aC8VhjHqhUk9PVA'

const DRIVE_FOLDER_PATH = /^\/drive(?:\/u\/\d+)?\/folders\/[A-Za-z0-9_-]+\/?$/

export function getFieldSafetyFolderUrlError(rawUrl: string): string | null {
  const trimmed = rawUrl.trim()

  if (!trimmed) {
    return 'A Google Drive folder URL is required.'
  }

  if (trimmed.length > 2048) {
    return 'The folder URL must be 2,048 characters or fewer.'
  }

  try {
    const url = new URL(trimmed)
    if (
      url.protocol !== 'https:'
      || url.hostname !== 'drive.google.com'
      || url.username
      || url.password
      || url.port
      || !DRIVE_FOLDER_PATH.test(url.pathname)
    ) {
      return 'Enter an HTTPS Google Drive folder URL.'
    }
  } catch {
    return 'Enter an HTTPS Google Drive folder URL.'
  }

  return null
}

export function getFieldSafetyDocumentUrlError(rawUrl: string): string | null {
  const trimmed = rawUrl.trim()

  if (!trimmed) {
    return 'A Google Drive document URL is required.'
  }

  if (trimmed.length > 2048) {
    return 'The document URL must be 2,048 characters or fewer.'
  }

  try {
    const url = new URL(trimmed)
    const isGoogleDocument =
      url.protocol === 'https:'
      && (url.hostname === 'drive.google.com' || url.hostname === 'docs.google.com')
      && !url.username
      && !url.password
      && !url.port

    return isGoogleDocument ? null : 'Enter an HTTPS Google Drive document URL.'
  } catch {
    return 'Enter an HTTPS Google Drive document URL.'
  }
}

export function normalizeFieldSafetyUrl(rawUrl: string): string {
  return new URL(rawUrl.trim()).toString()
}

export type FieldSafetyDocumentKind = 'pdf' | 'word' | 'document' | 'spreadsheet' | 'slides' | 'drive'

export function getFieldSafetyDocumentKind(
  title: string,
  rawUrl: string,
): FieldSafetyDocumentKind {
  const normalizedTitle = title.trim().toLowerCase()

  if (normalizedTitle.endsWith('.pdf')) {
    return 'pdf'
  }

  if (normalizedTitle.endsWith('.doc') || normalizedTitle.endsWith('.docx')) {
    return 'word'
  }

  try {
    const url = new URL(rawUrl)
    if (url.hostname === 'docs.google.com') {
      if (url.pathname.includes('/spreadsheets/')) return 'spreadsheet'
      if (url.pathname.includes('/presentation/')) return 'slides'
      return 'document'
    }
  } catch {
    // Stored URLs are database-constrained; fall back to a generic Drive item.
  }

  return 'drive'
}

export function getFieldSafetyDocumentKindLabel(kind: FieldSafetyDocumentKind): string {
  switch (kind) {
    case 'pdf':
      return 'PDF'
    case 'word':
      return 'Word document'
    case 'document':
      return 'Google document'
    case 'spreadsheet':
      return 'Spreadsheet'
    case 'slides':
      return 'Presentation'
    default:
      return 'Google Drive'
  }
}
