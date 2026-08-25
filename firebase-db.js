/* =========================================================================
   BSIT-1A ATTENDANCE WEBAPP — FIREBASE DATA LAYER
   -------------------------------------------------------------------------
   Every function here talks to Firestore instead of localStorage, so data
   is shared live across every student's own phone and the admin's device.
   Requires js/firebase-config.js to be filled in and loaded first.
   ========================================================================= */

const FDB = {
  ADMIN_EMAIL_HINT: "Use the admin email you created in Firebase Authentication.",

  /* ------------------------------- helpers -------------------------------- */
  todayStr() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },
  timeStr() {
    return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  },
  prettyDate(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  },

  /* --------------------------------- auth ---------------------------------- */
  ensureAnonAuth() {
    return new Promise((resolve, reject) => {
      const unsub = auth.onAuthStateChanged((user) => {
        unsub();
        if (user) { resolve(user); return; }
        auth.signInAnonymously().then((cred) => resolve(cred.user)).catch(reject);
      });
    });
  },
  async adminSignIn(email, password) {
    try {
      await auth.signInWithEmailAndPassword(email, password);
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e.message.replace("Firebase: ", "") };
    }
  },
  adminSignOut() {
    return auth.signOut();
  },
  onAuthReady(callback) {
    return auth.onAuthStateChanged(callback);
  },
  currentUid() {
    return auth.currentUser ? auth.currentUser.uid : null;
  },

  /* ------------------------------- students --------------------------------- */
  async findStudent(studentNumber) {
    const snap = await db.collection("students").doc(studentNumber).get();
    return snap.exists ? snap.data() : null;
  },
  async addStudent(fullName, studentNumber) {
    const ref = db.collection("students").doc(studentNumber);
    const existing = await ref.get();
    if (existing.exists) return { ok: false, message: "That student number is already registered." };
    await ref.set({ fullName: fullName.trim(), studentNumber, dateAdded: this.todayStr() });
    return { ok: true };
  },
  async removeStudent(studentNumber) {
    await db.collection("students").doc(studentNumber).delete();
  },
  listenStudents(callback) {
    return db.collection("students").orderBy("fullName").onSnapshot((snap) => {
      callback(snap.docs.map((d) => d.data()));
    });
  },

  /* ------------------------------ student login ------------------------------- */
  async studentLogin(fullName, studentNumber) {
    await this.ensureAnonAuth();
    const record = await this.findStudent(studentNumber);
    if (!record) return { ok: false, message: "Student number not found. Ask your admin to add you first." };
    if (record.fullName.trim().toLowerCase() !== fullName.trim().toLowerCase()) {
      return { ok: false, message: "That name doesn't match our records for this student number." };
    }
    sessionStorage.setItem("bsit1a_student_session", JSON.stringify(record));
    return { ok: true };
  },
  currentStudent() {
    try {
      const raw = sessionStorage.getItem("bsit1a_student_session");
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  studentLogout() {
    sessionStorage.removeItem("bsit1a_student_session");
  },

  /* ------------------------------- attendance --------------------------------- */
  listenAttendanceToday(callback) {
    return db.collection("attendance").where("date", "==", this.todayStr())
      .onSnapshot((snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  },
  listenAttendanceHistory(callback) {
    return db.collection("attendance").orderBy("date", "desc")
      .onSnapshot((snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  },
  listenStudentHistory(studentNumber, callback) {
    return db.collection("attendance").where("studentNumber", "==", studentNumber)
      .onSnapshot((snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.date < b.date ? 1 : -1));
        callback(rows);
      });
  },
  async checkCodeAndMark(studentNumber, fullName, inputCode) {
  await this.ensureAnonAuth();
  const codeSnap = await db.collection("meta").doc("code").get();
  const current = codeSnap.exists ? codeSnap.data() : null;
  if (!current || current.date !== this.todayStr()) {
    return { ok: false, message: "No active code for today yet. Ask your admin to generate one." };
  }
  if (current.code !== String(inputCode).trim()) {
    return { ok: false, message: "That code is incorrect or expired." };
  }
  const dupe = await db.collection("attendance")
    .where("studentNumber", "==", studentNumber)
    .where("date", "==", this.todayStr())
    .limit(1).get();
  if (!dupe.empty) return { ok: false, message: "You're already marked present today." };

  await db.collection("attendance").add({
    studentNumber, fullName, date: this.todayStr(), time: this.timeStr(), status: "present",
    uid: this.currentUid(), code: current.code,
  });
  return { ok: true };
},

  /* ----------------------------------- code ------------------------------------ */
  listenCode(callback) {
    return db.collection("meta").doc("code").onSnapshot((snap) => callback(snap.exists ? snap.data() : null));
  },
  async generateCode() {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const record = { code, date: this.todayStr(), time: this.timeStr() };
    await db.collection("meta").doc("code").set(record);
    return record;
  },

  /* ------------------------------- announcements --------------------------------- */
  listenAnnouncements(callback) {
    return db.collection("announcements").orderBy("createdAt", "desc")
      .onSnapshot((snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  },
  async addAnnouncement(text) {
    await db.collection("announcements").add({
      text: text.trim(), date: this.todayStr(), time: this.timeStr(), createdAt: Date.now(),
    });
  },
  async removeAnnouncement(id) {
    await db.collection("announcements").doc(id).delete();
  },

  /* -------------------------------- excuse letters --------------------------------- */
  async addExcuse(studentNumber, fullName, message) {
    await this.ensureAnonAuth();
    await db.collection("excuses").add({
      studentNumber, fullName, message: message.trim(),
      date: this.todayStr(), time: this.timeStr(), status: "pending",
      createdAt: Date.now(), ownerUid: this.currentUid(),
    });
  },
  listenMyExcuses(callback) {
    const uid = this.currentUid();
    if (!uid) { callback([]); return () => {}; }
    return db.collection("excuses").where("ownerUid", "==", uid).orderBy("createdAt", "desc")
      .onSnapshot((snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  },
  listenAllExcuses(callback) {
    return db.collection("excuses").orderBy("createdAt", "desc")
      .onSnapshot((snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  },
  async markExcuseReviewed(id) {
    await db.collection("excuses").doc(id).update({ status: "reviewed" });
  },
};
