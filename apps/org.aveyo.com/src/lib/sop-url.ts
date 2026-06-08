export type SopDocumentKind = 'slides' | 'spreadsheet' | 'document' | 'drive' | 'link'

export function normalizeSopUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    return ''
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  return `https://${trimmed}`
}

export function isValidSopUrl(rawUrl: string): boolean {
  const normalized = normalizeSopUrl(rawUrl)
  if (!normalized) {
    return false
  }

  try {
    const parsed = new URL(normalized)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function getSopDocumentKind(url: string): SopDocumentKind {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    const path = parsed.pathname

    if (host.includes('docs.google.com')) {
      if (path.includes('/spreadsheets/')) {
        return 'spreadsheet'
      }
      if (path.includes('/presentation/')) {
        return 'slides'
      }
      if (path.includes('/document/')) {
        return 'document'
      }
    }

    if (host.includes('drive.google.com')) {
      return 'drive'
    }
  } catch {
    // fall through
  }

  return 'link'
}

export function getSopDocumentKindLabel(kind: SopDocumentKind): string {
  switch (kind) {
    case 'slides':
      return 'Slide deck'
    case 'spreadsheet':
      return 'Spreadsheet'
    case 'document':
      return 'Document'
    case 'drive':
      return 'Google Drive'
    default:
      return 'External link'
  }
}
