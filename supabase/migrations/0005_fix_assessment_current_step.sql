alter table public.assessment_sessions
drop constraint if exists assessment_sessions_current_step_check;

alter table public.assessment_sessions
add constraint assessment_sessions_current_step_check
check (current_step between 1 and 6);
