-- Sync Ava support-agent access based on approved job_title + department combinations.
-- Combinations provided by business:
-- 1) Customer Care Agent + Customer Care
-- 2) Customer Care Team Lead + Customer Care
-- 3) Customer Care Supervisor + Operations
--
-- We also treat "Customer Care" job title (without suffix) as valid for Customer Care
-- to cover historical data inconsistencies.

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
    LEFT JOIN public.departments d ON d.id = p.department_id
    WHERE p.id = p_user_id
      AND COALESCE(p.employment_status, 'active') = 'active'
      AND (
        COALESCE(p.is_customer_support_agent, FALSE)
        OR public.is_admin_like(p_user_id)
        OR (
          lower(trim(COALESCE(p.job_title, ''))) IN ('customer care', 'customer care agent')
          AND lower(trim(COALESCE(d.name, ''))) = 'customer care'
        )
        OR (
          lower(trim(COALESCE(p.job_title, ''))) = 'customer care team lead'
          AND lower(trim(COALESCE(d.name, ''))) = 'customer care'
        )
        OR (
          lower(trim(COALESCE(p.job_title, ''))) = 'customer care supervisor'
          AND lower(trim(COALESCE(d.name, ''))) = 'operations'
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_ava_support_agent(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_ava_support_agent(UUID) TO authenticated, service_role;

UPDATE public.profiles p
SET is_customer_support_agent = TRUE
FROM public.departments d
WHERE p.department_id = d.id
  AND (
    (
      lower(trim(COALESCE(p.job_title, ''))) IN ('customer care', 'customer care agent')
      AND lower(trim(COALESCE(d.name, ''))) = 'customer care'
    )
    OR (
      lower(trim(COALESCE(p.job_title, ''))) = 'customer care team lead'
      AND lower(trim(COALESCE(d.name, ''))) = 'customer care'
    )
    OR (
      lower(trim(COALESCE(p.job_title, ''))) = 'customer care supervisor'
      AND lower(trim(COALESCE(d.name, ''))) = 'operations'
    )
  );
