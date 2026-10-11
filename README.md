HouseHub

Smart Household Task & Resource Planner

HouseHub helps a family share chores fairly. It suggests who should do each task based on availability, preferences, workload and deadlines.

Features
Family admin and member roles, with a join code
Member availability, preferences and status
Task management with priority, deadline and recurrence
Automatic task assignment with a short reason
Accept, reject or request reassignment
Auto reassignment when a member becomes busy
Live dashboard, calendar, analytics and notifications
Tech Stack

React, TypeScript, Tailwind CSS, Node.js, Express, Supabase

Prerequisites

Node.js

Run Locally
Install dependencies: npm install
Set the GEMINI_API_KEY in .env.local to your Gemini API key
Add your Supabase values in .env.local:
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
Run the app: npm run dev

Do not commit .env.local.

How to Use
Register an account. You become the family admin.
Share the join code from Settings so other members can join.
Add members, set their availability and preferences.
Create tasks with a priority and deadline.
Generate assignments. Each suggestion shows a short reason.
Members accept, reject (with a reason) or request reassignment.
Track progress on the dashboard, calendar and analytics pages.