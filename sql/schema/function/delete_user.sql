-- 사용자 삭제를 위한 RPC 함수
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- auth.users 테이블에서 현재 사용자 삭제
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;