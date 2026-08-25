# Firebase Setup — BSIT-1A Attendance (Firebase Edition)

This folder is the same app, same design, but every page and phone reads
and writes to one shared Firebase project instead of the browser's own
storage. That's what makes it work across everyone's own device.

## 1. Create the Firebase project
1. Go to https://console.firebase.google.com and sign in with any Google account.
2. **Add project** → name it `bsit1a-attendance` (or anything) → you can
   disable Google Analytics for this, it isn't needed → **Create project**.

## 2. Turn on Firestore (the database)
1. In the left sidebar: **Build → Firestore Database → Create database**.
2. Choose **Start in production mode** (we'll paste our own rules next).
3. Pick the region closest to you → **Enable**.

## 3. Turn on Authentication
1. Left sidebar: **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password**.
3. Also enable **Anonymous** — this is what lets students' phones write
   attendance/excuse data without needing their own account.

## 4. Create your admin account
1. Still in **Authentication**, open the **Users** tab.
2. **Add user** → enter the email and password you (the admin) will log in
   with. This is what you'll type into `admin-login.html`.

## 5. Get your web app config
1. Click the **gear icon → Project settings**.
2. Scroll to **Your apps** → click the **</>** (web) icon.
3. Give it a nickname (e.g. `bsit1a-web`) → **Register app**.
4. Copy the `firebaseConfig` object it shows you.
5. Open `js/firebase-config.js` in this folder and paste your values in,
   replacing the `PASTE_YOUR_...` placeholders.

## 6. Apply the security rules
1. Back in **Firestore Database → Rules** tab.
2. Open `firestore.rules` in this folder, copy it, and paste it in — but
   first replace `YOUR_ADMIN_EMAIL@example.com` with the exact email you
   created in step 4.
3. Click **Publish**.

These rules are what make excuse letters private (only you and the student
who wrote it can read a given letter) and keep the roster/code/announcements
editable by you only, while still letting anyone read what they need to
check in.

## 7. Test it
1. Open `index.html` (locally with `python3 -m http.server 8080`, or after
   publishing — see below).
2. Log in as admin, add one test student, generate a code.
3. Open the student login on a **different device or browser** (or an
   incognito window), log in as that student, enter the code.
4. Watch it appear on the admin's "Today" tab within a second or two —
   that's the live sync working.

## 8. Publish to GitHub Pages
Same steps as the local edition — see `README.md`. Firebase doesn't need
Firebase Hosting for this to work; GitHub Pages serves the files, and the
page talks to your Firebase project over the internet from any visitor's
browser.

## Notes on cost and privacy
- Firebase's free "Spark" plan comfortably covers a single class section —
  you'd need very heavy daily use to approach any limit.
- It's expected and safe for `firebaseConfig` (the API key, project ID,
  etc.) to be visible in your public GitHub repo. Firebase apps are secured
  by the **rules**, not by hiding that config — this is the standard,
  documented way Firebase apps work.
- If you ever want to reset all data, you can delete documents directly
  from the Firestore console under **Firestore Database → Data**.
