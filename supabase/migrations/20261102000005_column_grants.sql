-- Column-level hardening: users can edit their settings but never ownership or keys.
revoke update on public.workspaces from authenticated;
grant update (brand_name, accent, headline_font, logo_path, monthly_goal_cents, annual_goal_cents, timezone) on public.workspaces to authenticated;

revoke update on public.creator_profiles from authenticated;
grant update (display_name, business_name, niche, location, platforms, follower_range, revenue_streams, has_manager, business_structure, priority, onboarding_step, onboarding_completed_at) on public.creator_profiles to authenticated;

revoke update on public.user_settings from authenticated;
grant update (daily_briefing, email_digest, push_alerts, analytics_opt_in) on public.user_settings to authenticated;

-- Payments and income are append/delete only from the app; editing amounts in place is not allowed.
revoke update on public.payments, public.income_entries from authenticated;
