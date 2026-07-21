-- Fire the analyze-video edge function whenever a clip is queued.
-- Applied to project bqfylkqgmzbweczhgjhe. If you re-create the project, swap in
-- the new URL and anon key (the anon key is public by design — it ships to
-- every browser; RLS is what protects the data).

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_analyze_video()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform net.http_post(
    url := 'https://bqfylkqgmzbweczhgjhe.supabase.co/functions/v1/analyze-video',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZnlsa3FnbXpid2VjemhnamhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MTU3NzIsImV4cCI6MjEwMDA5MTc3Mn0.aL4PRiRcfxfYzRGNLTT9yF6_bj2ERTjrspAPrHUaNVQ'
    ),
    body := jsonb_build_object('video_id', new.id),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

revoke execute on function public.notify_analyze_video() from public, anon, authenticated;

create trigger videos_analyze_webhook
  after insert on public.videos
  for each row execute procedure public.notify_analyze_video();
