import { describe, expect, it } from 'vitest'
import {
  getFieldSafetyDocumentKind,
  getFieldSafetyDocumentUrlError,
  getFieldSafetyFolderUrlError,
  normalizeFieldSafetyUrl,
} from './field-safety'

describe('Field Safety Drive URL validation', () => {
  it('accepts Drive folders for folder records', () => {
    expect(
      getFieldSafetyFolderUrlError(
        'https://drive.google.com/drive/folders/1rxQVcSWJ2moeTBuF3Gu7B37GPvugFiFJ',
      ),
    ).toBeNull()
  })

  it.each([
    'https://docs.google.com/document/d/document-id/edit',
    'https://drive.google.com/file/d/file-id/view',
  ])('accepts Google document links: %s', (url) => {
    expect(getFieldSafetyDocumentUrlError(url)).toBeNull()
  })

  it.each([
    '',
    'http://drive.google.com/file/d/file-id/view',
    'https://example.com/file.pdf',
  ])('rejects missing or non-Google document links: %s', (url) => {
    expect(getFieldSafetyDocumentUrlError(url)).not.toBeNull()
  })

  it('normalizes a valid Google URL', () => {
    expect(normalizeFieldSafetyUrl(' https://drive.google.com/file/d/file-id/view ')).toBe(
      'https://drive.google.com/file/d/file-id/view',
    )
  })
})

describe('Field Safety document kinds', () => {
  it('uses the file name for PDF and Word documents', () => {
    expect(getFieldSafetyDocumentKind('Safety Program.pdf', 'https://drive.google.com/file/d/id/view'))
      .toBe('pdf')
    expect(getFieldSafetyDocumentKind('Safety Program.docx', 'https://docs.google.com/document/d/id/edit'))
      .toBe('word')
  })
})
