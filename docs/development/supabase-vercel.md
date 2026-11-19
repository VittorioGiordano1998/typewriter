# Supabase and Vercel setup

The app uses Supabase email/password authentication and stores one versioned archive per user in
Postgres. Apply `supabase/migrations/202611190001_account_archives.sql` in the Supabase SQL editor
(or via the Supabase migration workflow). It creates the table and row-level security policies.
The SQL must be applied to the intended project before signing in. Test with two accounts before
sharing the application. The policies limit access to rows owned by `auth.uid()`.

In Supabase, enable email/password sign-in and configure the site URL and allowed redirect URLs
for the intended Vercel domain. Email confirmation and delivery depend on the project's Auth
settings; configure a suitable SMTP provider for production.

Copy `app/.env.example` to `app/.env.local`, then set `VITE_SUPABASE_URL` to the project URL and
`VITE_SUPABASE_PUBLISHABLE_KEY` to its publishable (or legacy anon) key. Both are public browser
configuration. Never use a service-role or secret key in the application or Vite variables.
Restart Vite after changing them.

For Vercel import the Git repository and set the root directory to `app`; use the Vite preset,
`npm run build` and output directory `dist`. Set the same two Vite variables for each intended
Vercel environment and redeploy after changing them. Configure Supabase Auth redirect URLs for
production and any intended preview URLs. This repository does not itself deploy to Vercel.

The pre-account `typewriter.v1` data stays in the browser. After sign-in, use the import button
to copy its sheets into the account without deleting the original. Existing document IDs are not
imported twice. The app retains account-scoped unsynced drafts in browser storage when available.
Concurrent edits use a revision check; on conflict, the local draft is retained and the app stops
uploading rather than overwriting the newer archive. Export the local sheets before resolving a
conflict; automatic merge and cross-device conflict resolution are not yet implemented.
