/**
 * send-survey-email – Quarterly employee survey launch/reminder emails via Resend.
 * Types: 'launch' (all active employees), 'reminder' (active employees who have
 * not completed the current quarter's survey), 'test' (specific addresses
 * provided in the request body, subject prefixed with [TEST]).
 *
 * Admin-only: the requester (derived from the bearer JWT) must be an admin.
 * Recipients are computed server-side so the client never enumerates emails.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@send.aveyo.com'
const APP_URL = Deno.env.get('APP_URL') || 'https://org.aveyo.com'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
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

function logEvent(event: string, details: Record<string, unknown>) {
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...details }))
}

function currentQuarterLabel(): string {
  const now = new Date()
  return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`
}

function formatQuarterLabel(quarter: string): string {
  const [year, q] = quarter.split('-')
  return `${q} ${year}`
}

// Survey window: first 30 days of each calendar quarter (mirrors SQL helper).
function isSurveyWindowOpen(): boolean {
  const now = new Date()
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
  const windowClose = new Date(now.getFullYear(), quarterStartMonth, 1)
  windowClose.setDate(windowClose.getDate() + 30)
  return now < windowClose
}

// Layout mirrors the "Email Wrapper" design in Figma (Aveyo 2026, node 1195:2484):
// black header with logo + accent line, white body card, light-blue callout and
// CTA, gray footer. Table-based with inline styles for email client support.
function surveyEmailHtml(kind: 'launch' | 'reminder', quarterLabel: string): string {
  const heading =
    kind === 'launch'
      ? `The ${quarterLabel} Aveyo Employee Survey is Open`
      : `Reminder: ${quarterLabel} Aveyo Employee Survey`

  const intro =
    kind === 'launch'
      ? 'Our quarterly employee survey is now open. It takes about two minutes to complete.'
      : "Just a quick reminder — you haven't completed this quarter's employee survey yet. It takes about two minutes."

  const fontStack = "'Inter', Helvetica, Arial, sans-serif"

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Aveyo</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4;">
      <tr>
        <td align="center">
          <table role="presentation" width="672" cellpadding="0" cellspacing="0" border="0" style="width: 672px; max-width: 100%;">

            <!-- Header -->
            <tr>
              <td align="center" style="background-color: #111111; padding: 48px 40px;">
                <img src="${APP_URL}/images/logo-wordmark-white.png" alt="Aveyo" width="110" style="display: block; width: 110px; height: auto;" />
                <div style="width: 48px; height: 2px; background-color: #a8d8ea; margin: 24px auto;"></div>
                <div style="font-family: ${fontStack}; font-size: 28px; font-weight: bold; color: #ffffff; text-align: center; max-width: 520px;">
                  ${heading}
                </div>
              </td>
            </tr>

            <!-- Body card -->
            <tr>
              <td style="background-color: #ffffff; padding: 40px 48px;">
                <p style="font-family: ${fontStack}; font-size: 15px; color: #111111; margin: 0 0 20px;">Hi there,</p>
                <p style="font-family: ${fontStack}; font-size: 15px; color: #111111; line-height: 1.5; margin: 0 0 20px;">${intro}</p>
                <p style="font-family: ${fontStack}; font-size: 15px; color: #111111; line-height: 1.5; margin: 0 0 24px;">A key part of our mission is to become the most trusted solar brand in the world. To achieve that, we must ensure that our customers and employees feel completely taken care of. Your feedback is crucial to improving our internal processes and culture.</p>

                <!-- Confidentiality callout -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px;">
                  <tr>
                    <td style="background-color: #eef7fb; border-left: 4px solid #a8d8ea; padding: 16px 20px;">
                      <p style="font-family: ${fontStack}; font-size: 14px; color: #111111; line-height: 1.5; margin: 0;">Please answer openly and honestly. Your answers will remain confidential &mdash; responses are stored anonymously and are never linked to your name.</p>
                    </td>
                  </tr>
                </table>

                <!-- CTA button -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px;">
                  <tr>
                    <td style="background-color: #a8d8ea;">
                      <a href="${APP_URL}/survey" style="display: inline-block; font-family: ${fontStack}; font-size: 14px; font-weight: 600; color: #111111; text-decoration: none; padding: 14px 28px;">Take the Survey</a>
                    </td>
                  </tr>
                </table>

                <p style="font-family: ${fontStack}; font-size: 15px; color: #111111; margin: 0;">Best regards,</p>
                <p style="font-family: ${fontStack}; font-size: 15px; font-weight: 600; color: #111111; margin: 2px 0 0;">The Aveyo Team</p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="background-color: #f4f4f4; padding: 28px 48px;">
                <p style="font-family: ${fontStack}; font-size: 12px; color: #888888; text-align: center; margin: 0;">This is an automated message from your organization system.</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error('send-survey-email: Resend API error:', errText)
    return false
  }

  return true
}

serve(async (req) => {
  const requestId = crypto.randomUUID()

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED', requestId }, 405)
  }

  try {
    if (!RESEND_API_KEY) {
      return jsonResponse({ error: 'Resend not configured', code: 'RESEND_NOT_CONFIGURED', requestId }, 500)
    }

    const body = await req.json()
    const kind = body?.type as 'launch' | 'reminder' | 'test' | undefined

    if (kind !== 'launch' && kind !== 'reminder' && kind !== 'test') {
      return jsonResponse(
        { error: "type must be 'launch', 'reminder', or 'test'", code: 'INVALID_TYPE', requestId },
        400
      )
    }

    const token = getBearerToken(req)
    if (!token) {
      return jsonResponse({ error: 'Invalid JWT', code: 'INVALID_JWT', requestId }, 401)
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !authData?.user) {
      return jsonResponse({ error: 'Invalid JWT', code: 'INVALID_JWT', requestId }, 401)
    }

    const actorId = authData.user.id
    const { data: requesterProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, is_admin, is_super_admin')
      .eq('id', actorId)
      .single()

    if (profileError || !requesterProfile) {
      return jsonResponse(
        { error: 'Could not verify requester identity', code: 'REQUESTER_PROFILE_NOT_FOUND', requestId },
        403
      )
    }

    if (!requesterProfile.is_admin && !requesterProfile.is_super_admin) {
      logEvent('survey_email_authz_denied', { requestId, actorId, kind })
      return jsonResponse({ error: 'Insufficient permissions', code: 'ADMIN_REQUIRED', requestId }, 403)
    }

    // Test sends are allowed even when the window is closed, so admins can
    // preview the email ahead of a quarter opening.
    if (kind !== 'test' && !isSurveyWindowOpen()) {
      return jsonResponse({ error: 'The survey window is closed', code: 'WINDOW_CLOSED', requestId }, 400)
    }

    const quarter = currentQuarterLabel()
    const quarterLabel = formatQuarterLabel(quarter)

    // ── test: send only to explicitly provided addresses ─────────────────────
    if (kind === 'test') {
      const rawEmails = Array.isArray(body?.emails) ? body.emails : []
      const emails = rawEmails
        .filter((e: unknown): e is string => typeof e === 'string')
        .map((e: string) => e.trim())
        .filter((e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))

      if (emails.length === 0) {
        return jsonResponse(
          { error: 'emails must be a non-empty array of valid addresses', code: 'INVALID_EMAILS', requestId },
          400
        )
      }

      if (emails.length > 10) {
        return jsonResponse(
          { error: 'At most 10 test recipients are allowed', code: 'TOO_MANY_EMAILS', requestId },
          400
        )
      }

      const testSubject = `[TEST] The ${quarterLabel} Aveyo Employee Survey is Open`
      const testHtml = surveyEmailHtml('launch', quarterLabel)
      const results = await Promise.all(
        emails.map((email: string) => sendEmail(email, testSubject, testHtml))
      )
      const sentCount = results.filter(Boolean).length

      logEvent('survey_email_sent', { requestId, actorId, kind, quarter, recipientCount: emails.length, sentCount })
      return jsonResponse({ success: true, sentCount, requestId })
    }

    const { data: activeProfiles, error: activeError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('employment_status', 'active')

    if (activeError) {
      return jsonResponse({ error: activeError.message, code: 'PROFILE_LOOKUP_FAILED', requestId }, 500)
    }

    let recipients = (activeProfiles ?? []).filter((p) => p.email)

    if (kind === 'reminder') {
      const { data: completions, error: completionsError } = await supabaseAdmin
        .from('employee_survey_completions')
        .select('profile_id')
        .eq('quarter', quarter)

      if (completionsError) {
        return jsonResponse({ error: completionsError.message, code: 'COMPLETION_LOOKUP_FAILED', requestId }, 500)
      }

      const completedIds = new Set((completions ?? []).map((c) => c.profile_id))
      recipients = recipients.filter((p) => !completedIds.has(p.id))
    }

    if (recipients.length === 0) {
      return jsonResponse({ success: true, sentCount: 0, requestId })
    }

    const subject =
      kind === 'launch'
        ? `The ${quarterLabel} Aveyo Employee Survey is Open`
        : `Reminder: Complete the ${quarterLabel} Aveyo Employee Survey`
    const html = surveyEmailHtml(kind, quarterLabel)

    // Send individually so recipients never see each other's addresses.
    let sentCount = 0
    const batchSize = 10
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)
      const results = await Promise.all(batch.map((p) => sendEmail(p.email, subject, html)))
      sentCount += results.filter(Boolean).length
    }

    logEvent('survey_email_sent', {
      requestId,
      actorId,
      kind,
      quarter,
      recipientCount: recipients.length,
      sentCount,
    })

    return jsonResponse({ success: true, sentCount, requestId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    logEvent('send_survey_email_unexpected_error', { requestId, error: message })
    return jsonResponse({ error: message, code: 'UNEXPECTED_ERROR', requestId }, 500)
  }
})
