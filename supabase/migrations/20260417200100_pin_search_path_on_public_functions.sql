-- SEC-2: Pin search_path = public on 10 public functions flagged by the
-- Supabase advisor (function_search_path_mutable, WARN).
--
-- None of these are SECURITY DEFINER, so the attack surface is minimal —
-- but pinning search_path is cheap hygiene and silences the advisor lint.
-- Using ALTER FUNCTION (not CREATE OR REPLACE) to avoid touching bodies.

ALTER FUNCTION public.assign_entry_number()                          SET search_path = public;
ALTER FUNCTION public.decrement_member_count(uuid)                   SET search_path = public;
ALTER FUNCTION public.find_nearby_users(numeric, numeric, integer)   SET search_path = public;
ALTER FUNCTION public.increment_member_count(uuid)                   SET search_path = public;
ALTER FUNCTION public.update_group_member_count()                    SET search_path = public;
ALTER FUNCTION public.update_location_point()                        SET search_path = public;
ALTER FUNCTION public.update_server_member_count()                   SET search_path = public;
ALTER FUNCTION public.update_testimony_like_count()                  SET search_path = public;
ALTER FUNCTION public.update_testimony_view_count()                  SET search_path = public;
ALTER FUNCTION public.update_updated_at_column()                     SET search_path = public;
