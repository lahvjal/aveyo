import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type Decision = 'allow' | 'deny'

interface MatrixFile {
  roles: string[]
  sql: Record<string, Record<string, Decision>>
  edge: Record<string, Record<string, Decision>>
  ui: Record<string, Record<string, string>>
}

function loadMatrix(): MatrixFile {
  const file = resolve(process.cwd(), 'authz-regression-matrix.json')
  return JSON.parse(readFileSync(file, 'utf-8')) as MatrixFile
}

describe('authz regression matrix', () => {
  const matrix = loadMatrix()

  it('keeps role coverage complete for SQL scenarios', () => {
    for (const scenario of Object.values(matrix.sql)) {
      for (const role of matrix.roles) {
        expect(scenario[role]).toBeDefined()
        expect(['allow', 'deny']).toContain(scenario[role])
      }
    }
  })

  it('keeps role coverage complete for edge scenarios', () => {
    for (const scenario of Object.values(matrix.edge)) {
      for (const role of matrix.roles) {
        expect(scenario[role]).toBeDefined()
        expect(['allow', 'deny']).toContain(scenario[role])
      }
    }
  })

  it('preserves key privilege-escalation denials', () => {
    expect(matrix.sql.profiles_anon_update_privileged_columns.anon).toBe('deny')
    expect(matrix.sql.profiles_self_update_privileged_columns.authenticated).toBe('deny')
    expect(matrix.sql.profiles_self_update_privileged_columns.manager).toBe('deny')
    expect(matrix.edge.admin_user_ops_update_profile_manager_privileged_fields.manager).toBe('deny')
    expect(matrix.edge.send_invitation_email_body_spoofed_userid.authenticated).toBe('deny')
  })

  it('limits Operations link reads and writes to Operations Managers and admins', () => {
    for (const scenario of [
      matrix.sql.operations_tab_links_read,
      matrix.sql.operations_tab_links_write,
    ]) {
      expect(scenario.anon).toBe('deny')
      expect(scenario.authenticated).toBe('deny')
      expect(scenario.manager).toBe('deny')
      expect(scenario.operations_manager).toBe('allow')
      expect(scenario.admin).toBe('allow')
      expect(scenario.super_admin).toBe('allow')
      expect(scenario.process_editor).toBe('deny')
    }
  })

  it('lets active staff read Field Safety while limiting maintenance to Operations leaders', () => {
    expect(matrix.sql.field_safety_library_read).toEqual({
      anon: 'deny',
      authenticated: 'allow',
      manager: 'allow',
      operations_manager: 'allow',
      admin: 'allow',
      super_admin: 'allow',
      process_editor: 'allow',
    })

    expect(matrix.sql.field_safety_library_write).toEqual({
      anon: 'deny',
      authenticated: 'deny',
      manager: 'deny',
      operations_manager: 'allow',
      admin: 'allow',
      super_admin: 'allow',
      process_editor: 'deny',
    })
  })

  it('limits Google Drive synchronization to Operations Managers and admins', () => {
    expect(matrix.edge.sync_google_drive_library).toEqual({
      anon: 'deny',
      authenticated: 'deny',
      manager: 'deny',
      operations_manager: 'allow',
      admin: 'allow',
      super_admin: 'allow',
      process_editor: 'deny',
    })
  })
})
