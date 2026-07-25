# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/7f7a498a-2c9f-4e78-9c7f-7547ac0ee8dc

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## About the app
Build a modern, high-performance Track & Field Meet Management & Leaderboard Web Application named "Pratap Athletics Hub" designed for sports meets, college track & field tournaments, and athletic clubs.

---

### 🎨 Visual & Aesthetic Design System
- Primary Color: Athletic Red (#D62828) for buttons, active tabs, and primary branding.
- Accent Color: Gold (#F4C430) for medal rankings, BIB numbers, and key highlights.
- Dark Accent / Text: Dark Slate/Charcoal (#1F2937) for crisp typography and primary headings.
- Background: Clean Off-White / Slate (#F8FAFC) for high contrast and modern readability.
- Highlight Color: Interactive Blue (#2563EB) for search highlights and links.
- Layout: Modern single-page web app with top navigation, responsive card layouts, and subtle smooth motion transitions.

---

### 🏃 Core Modules & Features

1. 🏆 Meet Results & Leaderboard Hub
   - Filterable results directory sorted by event discipline (100m, 200m, 400m, Relays, Long Jump, Shotput, Javelin, etc.).
   - Multi-parameter filters: Event Type, Gender (Male, Female, All), Tournament Year, and Athlete Name/BIB/ID Search.
   - Dynamic Leaderboard Ranking Cards: Automatically ranks athletes with Gold (1st), Silver (2nd), and Bronze (3rd) medal badge overlays with custom ranking animations.
   - Athlete Profile Cards showing high-res profile photo (with image crop tool support), BIB number, Roll ID, College/Club name, and official mark/time.

2. 📸 High-Resolution Action Snapshot Gallery
   - Photo gallery featuring high-resolution trial action photos from various meets.
   - Filtering by meet title, discipline tag, and keyword search.
   - Fullscreen Lightbox View with zoom capabilities, snapshot metadata, venue info, and organizing body badges.
   - Photo Upload & Editor Tool allowing administrators to upload local images (with drag-and-drop or web URLs) and assign athlete tags.

3. 📅 Tournament Scheduling & Enrolment Hub
   - Calendar-style schedule manager listing upcoming and completed track & field meets.
   - Detailed event breakdown including date, time, stadium/arena venue, and contested disciplines.
   - Live Athlete Enrolment Tool: Interactive dropdown allowing eligible campus athletes to sign up for scheduled meets with real-time enrollment counters.

4. 🛡️ Admin Panel & Control Center
   - Password-protected administrative access for sports coordinators.
   - Announcement Board: Publish campus notices and attach document files.
   - Athlete Roster Management: Register student profiles, upload custom photos with an interactive Image Cropper modal, and update BIB numbers and club affiliations.
   - Official Mark Recording: Log race times, distances, and ranks directly into the live leaderboard database.
   - Tournament Creator: Schedule new meets and manage event disciplines.

---

### 🛠️ Technical Stack & Architecture
- Framework: React 18+ with TypeScript & Vite.
- Styling: Tailwind CSS v4 with custom color variables.
- Icons: Lucide React icon library.
- Animations: Motion (Framer Motion) for route switching and smooth card lift effects.
- Persistence: Firebase / Firestore integration for real-time leaderboard data and image records.
