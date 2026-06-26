-- Allow duplicate department names under different parents; keep names unique within a parent.
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_name_key;

CREATE UNIQUE INDEX departments_parent_id_name_key
  ON departments (COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(trim(name)));

-- Prevent self-reference and ancestor cycles when nesting departments.
CREATE OR REPLACE FUNCTION prevent_department_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  cursor_id UUID := NEW.parent_id;
  depth INT := 0;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'Department cannot be its own parent';
  END IF;

  WHILE cursor_id IS NOT NULL AND depth < 25 LOOP
    IF cursor_id = NEW.id THEN
      RAISE EXCEPTION 'Department hierarchy cycle detected';
    END IF;

    SELECT parent_id INTO cursor_id FROM departments WHERE id = cursor_id;
    depth := depth + 1;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS departments_prevent_cycle ON departments;

CREATE TRIGGER departments_prevent_cycle
  BEFORE INSERT OR UPDATE OF parent_id ON departments
  FOR EACH ROW
  EXECUTE FUNCTION prevent_department_cycle();
