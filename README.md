# ChatUp — PWA Chat App

A real-time PWA chat app where users can start anonymous conversations. Behind the scenes, all chats are handled by an admin who appears under a random female persona for each user.

## Features

- No sign-up required — just enter a username
- Real-time messaging powered by Supabase Realtime
- Image & video file sharing (up to 50MB)
- Admin panel with all conversations in one place
- PWA — installable on mobile and desktop
- Dark, modern UI

## Tech Stack

- **Next.js 15** (App Router)
- **Supabase** (Database + Realtime + Storage)
- **Tailwind CSS**
- **TypeScript**

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd chatapp
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open the **SQL Editor** and run `supabase/schema.sql`
3. In **Storage**, confirm the `chat-media` bucket was created (it's created by the SQL). If not, create it manually with public access

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_PASSCODE=Andre123@@@
```

Find your keys in Supabase → Project Settings → API.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Admin Access

Go to `/admin/login` and enter the passcode set in `ADMIN_PASSCODE`.

The admin dashboard shows all user conversations in real-time. Click any conversation to reply as the assigned random female persona.

---

## Deploy to Vercel

### Option A — Vercel CLI

```bash
npm i -g vercel
vercel
```

### Option B — GitHub + Vercel Dashboard

1. Push to GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

2. Go to [vercel.com](https://vercel.com), import the GitHub repo
3. Set environment variables in Vercel → Project Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSCODE`
4. Deploy!

---

## Project Structure

```
chatapp/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── chat/[conversationId]/      # User chat page
│   ├── admin/
│   │   ├── login/page.tsx          # Admin login
│   │   └── page.tsx                # Admin dashboard
│   └── api/
│       ├── conversations/          # CRUD for conversations
│       ├── messages/               # CRUD for messages
│       ├── upload/                 # File upload to Supabase Storage
│       └── admin/verify/           # Passcode verification
├── lib/
│   ├── supabase.ts                 # Client-side Supabase
│   ├── supabase-server.ts          # Server-side Supabase (service role)
│   ├── types.ts                    # TypeScript types
│   └── girl-names.ts               # Random female names for admin persona
├── public/
│   ├── manifest.json               # PWA manifest
│   ├── sw.js                       # Service worker
│   └── icons/                      # PWA icons
└── supabase/
    └── schema.sql                  # Full database schema
```

---

## Supabase Realtime Setup

Make sure Realtime is enabled for both `conversations` and `messages` tables:

1. Go to **Database → Replication** in your Supabase dashboard
2. Enable replication for `conversations` and `messages`

The schema SQL already includes the `ALTER PUBLICATION` commands, but you can also do it via the dashboard UI.
