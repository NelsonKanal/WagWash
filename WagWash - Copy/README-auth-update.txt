WAG & WASH AUTHENTICATION UPDATE

Files:
- App.jsx: replace your current src/App.jsx with this file.
- auth.css: place this file at src/auth.css. App.jsx imports it automatically.
- supabase-auth-setup.sql: run in Supabase SQL Editor after reviewing it.

Existing requirement:
- Keep src/lib/supabase.js configured with VITE_SUPABASE_URL and
  VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.
- Ensure @supabase/supabase-js and lucide-react are installed.

Auth setup:
1. Supabase Dashboard > Authentication > Providers: enable Email and Google.
2. For Google, configure the OAuth client ID/secret and Supabase callback URL
   as described in Supabase's Google provider guide.
3. Authentication > URL Configuration: set your site URL and add your local
   development URL (e.g. http://localhost:5173) to Redirect URLs.
4. Run supabase-auth-setup.sql in SQL Editor.
5. Create Jess's account, then uncomment the owner UPDATE at the bottom of the
   SQL file, replace the email, and run it as project admin. Sign out/in again.
6. Start the app with npm run dev.

Security behavior:
- Customers must sign in before they can use the app.
- Email/password sign-up and Google OAuth sign-in are included.
- Customer booking inserts attach auth.uid() as user_id.
- Customer booking reads are limited by RLS to their own user_id.
- Owner dashboard appears only when trusted app_metadata.role is 'owner'.
- The get_booked_slots function exposes only date/time/status for availability,
  not customer names, contact details, dog details, or notes.

Important:
- This update does not implement payment processing.
- Existing bookings with a NULL user_id need to be associated with the right
  accounts manually before those customers can see them.
- Review the RLS policies in your project before production deployment.
