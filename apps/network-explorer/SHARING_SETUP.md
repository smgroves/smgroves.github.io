# Network Explorer: turning on "Share to public"

The Share button and the "Shared by others" list stay hidden until the app knows where the
database is. One-time setup, about 10 minutes, free tier is plenty.

## 1. Create the database

1. Sign up at https://supabase.com (GitHub sign-in works) and click **New project**.
   Any name (e.g. `network-explorer`), pick a region near Virginia (East US), set a database password
   and keep it somewhere safe. Free plan.
2. When the project is ready, open **SQL Editor > New query**, paste all of
   `apps/network-explorer/sharing_setup.sql`, and click **Run**. It should say "Success. No rows returned".

## 2. Connect the app

1. In Supabase, open **Project Settings > API** (or **Connect**). Copy:
   - the **Project URL**, like `https://abcdefgh.supabase.co`
   - the **publishable** key (`sb_publishable_...`) or, on older projects, the **anon public** key (`eyJ...`).
   Never use the `service_role` / secret key here.
2. In `apps/network-explorer/index.html`, find `const PUBLIC_DB = { url: "", key: "" };` and fill both in.
   The publishable/anon key is designed to be public; the table's security rules decide what it can do.
3. Commit and push. The Share button appears once someone loads their own CSV.

## What visitors can and can't do

- Read any network that isn't hidden, and add new ones (name up to 80 characters, description up to 500,
  data up to about 1.5 MB).
- They can't edit, delete or hide anything, even their own.
- At most 20 networks can be shared per hour in total (spam brake). Change the number in the SQL file and re-run it.

## Taking a network down

Supabase > **Table Editor > public_networks**: tick `hidden` on that row (it disappears from the list right away),
or delete the row. The share dialog tells people to email smgroves@virginia.edu to have something removed.

## Things to know

- Free Supabase projects pause after a week with no activity; the app then just hides the shared list.
  Unpause from the Supabase dashboard (or upgrade) if that happens.
- Anything shared is public data on your site. There is no sign-in, so the author name is whatever people type.
