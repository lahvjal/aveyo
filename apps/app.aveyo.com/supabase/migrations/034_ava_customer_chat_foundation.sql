-- Ava multi-app foundation on shared Supabase project.
-- Goals:
-- 1) Keep existing internal employee app intact.
-- 2) Add isolated Ava customer/support chat domain under schema `ava`.
-- 3) Ensure customer signups do not auto-populate internal `public.profiles`.

-- -----------------------------------------------------------------------------
-- Employee/support role helpers
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_customer_support_agent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_is_customer_support_agent
  ON public.profiles (is_customer_support_agent);

CREATE OR REPLACE FUNCTION public.is_employee_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
      AND COALESCE(p.employment_status, 'active') = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_employee_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_employee_user(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_ava_support_agent(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
      AND COALESCE(p.employment_status, 'active') = 'active'
      AND (
        COALESCE(p.is_customer_support_agent, FALSE)
        OR public.is_admin_like(p_user_id)
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_ava_support_agent(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_ava_support_agent(UUID) TO authenticated, service_role;

COMMENT ON COLUMN public.profiles.is_customer_support_agent IS
  'True when this active employee can access Ava support-representative surfaces.';

-- -----------------------------------------------------------------------------
-- Signup trigger hardening (employee vs customer account separation)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_type TEXT := COALESCE(NEW.raw_user_meta_data->>'account_type', 'employee');
BEGIN
  -- Customer accounts should not be inserted into internal employee profiles.
  IF v_account_type = 'customer' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, job_title, start_date)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'job_title', 'Employee'),
    COALESCE((NEW.raw_user_meta_data->>'start_date')::date, CURRENT_DATE)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Ava schema and tables
-- -----------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS ava;

GRANT USAGE ON SCHEMA ava TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS ava.customer_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  project_customer_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ava.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_profile_id UUID REFERENCES ava.customer_profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'pending_handoff', 'active_handoff', 'resolved', 'closed')),
  handoff_state TEXT NOT NULL DEFAULT 'none'
    CHECK (handoff_state IN ('none', 'pending', 'claimed', 'active', 'resolved')),
  channel TEXT NOT NULL DEFAULT 'widget',
  subject TEXT,
  project_ref TEXT,
  active_support_agent_auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ava.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES ava.conversations(id) ON DELETE CASCADE,
  sender_kind TEXT NOT NULL
    CHECK (sender_kind IN ('customer', 'ava', 'support_agent', 'system')),
  sender_auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ava.handoff_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES ava.conversations(id) ON DELETE CASCADE,
  requested_by_auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'active', 'resolved', 'cancelled')),
  reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_by_auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT
);

CREATE TABLE IF NOT EXISTS ava.handoff_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  handoff_request_id UUID NOT NULL REFERENCES ava.handoff_requests(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES ava.conversations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('requested', 'claimed', 'activated', 'resolved', 'cancelled', 'queue_update')),
  actor_auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ava.support_agent_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES ava.conversations(id) ON DELETE CASCADE,
  author_auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visibility TEXT NOT NULL DEFAULT 'internal'
    CHECK (visibility IN ('internal')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ava.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_type TEXT NOT NULL CHECK (document_type IN ('training', 'policy')),
  title TEXT NOT NULL,
  description TEXT,
  storage_bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  byte_size BIGINT,
  checksum TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  uploaded_by_auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (storage_bucket, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_ava_customer_profiles_auth_user_id
  ON ava.customer_profiles (auth_user_id);

CREATE INDEX IF NOT EXISTS idx_ava_conversations_customer_auth_user_id
  ON ava.conversations (customer_auth_user_id);
CREATE INDEX IF NOT EXISTS idx_ava_conversations_status
  ON ava.conversations (status);
CREATE INDEX IF NOT EXISTS idx_ava_conversations_handoff_state
  ON ava.conversations (handoff_state);

CREATE INDEX IF NOT EXISTS idx_ava_messages_conversation_id_created_at
  ON ava.messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ava_messages_sender_auth_user_id
  ON ava.messages (sender_auth_user_id);

CREATE INDEX IF NOT EXISTS idx_ava_handoff_requests_conversation_id
  ON ava.handoff_requests (conversation_id);
CREATE INDEX IF NOT EXISTS idx_ava_handoff_requests_status
  ON ava.handoff_requests (status);
CREATE INDEX IF NOT EXISTS idx_ava_handoff_requests_pending_queue
  ON ava.handoff_requests (requested_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_ava_handoff_events_request_id_created_at
  ON ava.handoff_events (handoff_request_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ava_handoff_events_conversation_id_created_at
  ON ava.handoff_events (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ava_support_agent_notes_conversation_id_created_at
  ON ava.support_agent_notes (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ava_documents_document_type_status
  ON ava.documents (document_type, status);

DROP TRIGGER IF EXISTS update_ava_customer_profiles_updated_at ON ava.customer_profiles;
CREATE TRIGGER update_ava_customer_profiles_updated_at
  BEFORE UPDATE ON ava.customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ava_conversations_updated_at ON ava.conversations;
CREATE TRIGGER update_ava_conversations_updated_at
  BEFORE UPDATE ON ava.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ava_support_agent_notes_updated_at ON ava.support_agent_notes;
CREATE TRIGGER update_ava_support_agent_notes_updated_at
  BEFORE UPDATE ON ava.support_agent_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ava_documents_updated_at ON ava.documents;
CREATE TRIGGER update_ava_documents_updated_at
  BEFORE UPDATE ON ava.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Ava row-level security
-- -----------------------------------------------------------------------------

ALTER TABLE ava.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ava.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ava.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ava.handoff_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ava.handoff_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ava.support_agent_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ava.documents ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ava TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA ava TO service_role;

CREATE OR REPLACE FUNCTION ava.can_access_conversation(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ava, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM ava.conversations c
    WHERE c.id = p_conversation_id
      AND (
        c.customer_auth_user_id = auth.uid()
        OR public.is_ava_support_agent(auth.uid())
      )
  );
$$;

REVOKE ALL ON FUNCTION ava.can_access_conversation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ava.can_access_conversation(UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS "customers_view_own_customer_profile" ON ava.customer_profiles;
CREATE POLICY "customers_view_own_customer_profile"
  ON ava.customer_profiles FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "customers_update_own_customer_profile" ON ava.customer_profiles;
CREATE POLICY "customers_update_own_customer_profile"
  ON ava.customer_profiles FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "support_agents_manage_customer_profiles" ON ava.customer_profiles;
CREATE POLICY "support_agents_manage_customer_profiles"
  ON ava.customer_profiles FOR ALL
  TO authenticated
  USING (public.is_ava_support_agent(auth.uid()))
  WITH CHECK (public.is_ava_support_agent(auth.uid()));

DROP POLICY IF EXISTS "customers_and_support_view_conversations" ON ava.conversations;
CREATE POLICY "customers_and_support_view_conversations"
  ON ava.conversations FOR SELECT
  TO authenticated
  USING (
    customer_auth_user_id = auth.uid()
    OR public.is_ava_support_agent(auth.uid())
  );

DROP POLICY IF EXISTS "customers_create_own_conversations" ON ava.conversations;
CREATE POLICY "customers_create_own_conversations"
  ON ava.conversations FOR INSERT
  TO authenticated
  WITH CHECK (customer_auth_user_id = auth.uid());

DROP POLICY IF EXISTS "customers_and_support_update_conversations" ON ava.conversations;
CREATE POLICY "customers_and_support_update_conversations"
  ON ava.conversations FOR UPDATE
  TO authenticated
  USING (
    customer_auth_user_id = auth.uid()
    OR public.is_ava_support_agent(auth.uid())
  )
  WITH CHECK (
    customer_auth_user_id = auth.uid()
    OR public.is_ava_support_agent(auth.uid())
  );

DROP POLICY IF EXISTS "conversation_participants_view_messages" ON ava.messages;
CREATE POLICY "conversation_participants_view_messages"
  ON ava.messages FOR SELECT
  TO authenticated
  USING (ava.can_access_conversation(conversation_id));

DROP POLICY IF EXISTS "customers_insert_messages" ON ava.messages;
CREATE POLICY "customers_insert_messages"
  ON ava.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_kind = 'customer'
    AND sender_auth_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM ava.conversations c
      WHERE c.id = conversation_id
        AND c.customer_auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "support_agents_insert_messages" ON ava.messages;
CREATE POLICY "support_agents_insert_messages"
  ON ava.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_ava_support_agent(auth.uid())
    AND sender_auth_user_id = auth.uid()
    AND sender_kind IN ('support_agent', 'ava', 'system')
    AND ava.can_access_conversation(conversation_id)
  );

DROP POLICY IF EXISTS "conversation_participants_view_handoff_requests" ON ava.handoff_requests;
CREATE POLICY "conversation_participants_view_handoff_requests"
  ON ava.handoff_requests FOR SELECT
  TO authenticated
  USING (ava.can_access_conversation(conversation_id));

DROP POLICY IF EXISTS "customers_insert_handoff_requests" ON ava.handoff_requests;
CREATE POLICY "customers_insert_handoff_requests"
  ON ava.handoff_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by_auth_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM ava.conversations c
      WHERE c.id = conversation_id
        AND c.customer_auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "support_agents_update_handoff_requests" ON ava.handoff_requests;
CREATE POLICY "support_agents_update_handoff_requests"
  ON ava.handoff_requests FOR UPDATE
  TO authenticated
  USING (public.is_ava_support_agent(auth.uid()))
  WITH CHECK (public.is_ava_support_agent(auth.uid()));

DROP POLICY IF EXISTS "conversation_participants_view_handoff_events" ON ava.handoff_events;
CREATE POLICY "conversation_participants_view_handoff_events"
  ON ava.handoff_events FOR SELECT
  TO authenticated
  USING (ava.can_access_conversation(conversation_id));

DROP POLICY IF EXISTS "support_agents_insert_handoff_events" ON ava.handoff_events;
CREATE POLICY "support_agents_insert_handoff_events"
  ON ava.handoff_events FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_ava_support_agent(auth.uid())
    AND ava.can_access_conversation(conversation_id)
  );

DROP POLICY IF EXISTS "support_agents_manage_notes" ON ava.support_agent_notes;
CREATE POLICY "support_agents_manage_notes"
  ON ava.support_agent_notes FOR ALL
  TO authenticated
  USING (public.is_ava_support_agent(auth.uid()))
  WITH CHECK (
    public.is_ava_support_agent(auth.uid())
    AND author_auth_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "support_agents_manage_documents" ON ava.documents;
CREATE POLICY "support_agents_manage_documents"
  ON ava.documents FOR ALL
  TO authenticated
  USING (public.is_ava_support_agent(auth.uid()))
  WITH CHECK (public.is_ava_support_agent(auth.uid()));

-- -----------------------------------------------------------------------------
-- Ava storage buckets and policies (private)
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('ava-training-documents', 'ava-training-documents', false),
  ('ava-policy-documents', 'ava-policy-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "ava_support_agents_manage_training_docs" ON storage.objects;
CREATE POLICY "ava_support_agents_manage_training_docs"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'ava-training-documents'
    AND public.is_ava_support_agent(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'ava-training-documents'
    AND public.is_ava_support_agent(auth.uid())
  );

DROP POLICY IF EXISTS "ava_support_agents_manage_policy_docs" ON storage.objects;
CREATE POLICY "ava_support_agents_manage_policy_docs"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'ava-policy-documents'
    AND public.is_ava_support_agent(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'ava-policy-documents'
    AND public.is_ava_support_agent(auth.uid())
  );
