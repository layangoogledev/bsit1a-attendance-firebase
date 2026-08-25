(function () {
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  let students = [], attendanceToday = [], historyGroups = [], currentCode = null,
      announcements = [], excuses = [];

  FDB.onAuthReady((user) => {
    if (!user || user.isAnonymous) {
      window.location.href = "admin-login.html";
      return;
    }
    document.getElementById("adminBadge").textContent = `▣ ${user.email}`;
    document.getElementById("dateLine").textContent = FDB.prettyDate(FDB.todayStr());
    startListeners();
  });

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await FDB.adminSignOut();
    window.location.href = "index.html";
  });

  /* ---------------------------------- tabs ---------------------------------- */
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add("active");
    });
  });

  /* --------------------------------- stats ----------------------------------- */
  function renderStats() {
    const totalStudents = students.length;
    const presentToday = attendanceToday.length;
    const pendingExcuses = excuses.filter((e) => e.status === "pending").length;
    const codeActive = currentCode && currentCode.date === FDB.todayStr();

    document.getElementById("statGrid").innerHTML = `
      <div class="stat-card"><div class="num">${totalStudents}</div><div class="label">Total students</div></div>
      <div class="stat-card"><div class="num">${presentToday}</div><div class="label">Present today</div></div>
      <div class="stat-card"><div class="num">${totalStudents ? Math.max(totalStudents - presentToday, 0) : 0}</div><div class="label">Not checked in</div></div>
      <div class="stat-card"><div class="num">${pendingExcuses}</div><div class="label">Pending letters</div></div>
      <div class="stat-card"><div class="num">${codeActive ? currentCode.code : "—"}</div><div class="label">Active code</div></div>
    `;
  }

  /* ------------------------------- today's list -------------------------------- */
  function renderToday() {
    const rows = attendanceToday.slice().sort((a, b) => a.time.localeCompare(b.time));
    const body = document.getElementById("todayBody");
    document.getElementById("todayCount").textContent = `${rows.length} checked in`;
    if (rows.length === 0) { body.innerHTML = `<tr class="empty-row"><td colspan="4">No one has checked in yet today.</td></tr>`; return; }
    body.innerHTML = rows.map((r, i) => `
      <tr>
        <td class="mono muted">${i + 1}</td>
        <td>${escapeHtml(r.fullName)}</td>
        <td class="mono">${r.studentNumber}</td>
        <td class="mono">${r.time}</td>
      </tr>`).join("");
  }

  function renderLogFeed() {
    const rows = attendanceToday.slice().sort((a, b) => b.time.localeCompare(a.time));
    const feed = document.getElementById("logFeed");
    if (rows.length === 0) { feed.innerHTML = `<div class="muted">— no check-ins yet —</div>`; return; }
    feed.innerHTML = rows.map((r) =>
      `<div>[${r.time}] <span class="ok">${r.studentNumber}</span> → PRESENT · ${escapeHtml(r.fullName)}</div>`
    ).join("");
  }

  /* ---------------------------------- history ----------------------------------- */
  function renderHistory() {
    const grouped = {};
    historyGroups.forEach((r) => { (grouped[r.date] ||= []).push(r); });
    const dates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));
    const box = document.getElementById("historyList");
    if (dates.length === 0) { box.innerHTML = `<p class="muted">No attendance history yet.</p>`; return; }
    box.innerHTML = dates.map((date) => `
      <div class="list-item">
        <div class="row-between">
          <h3 style="margin:0;">${FDB.prettyDate(date)}</h3>
          <span class="badge badge-present"><span class="dot"></span>${grouped[date].length} present</span>
        </div>
        <div class="table-wrap" style="margin-top:10px;">
          <table>
            <thead><tr><th>Name</th><th>Student No.</th><th>Time</th></tr></thead>
            <tbody>
              ${grouped[date].map((r) => `<tr><td>${escapeHtml(r.fullName)}</td><td class="mono">${r.studentNumber}</td><td class="mono">${r.time}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>`).join("");
  }

  /* --------------------------------- roster ------------------------------------- */
  function renderRoster() {
    const body = document.getElementById("rosterBody");
    if (students.length === 0) { body.innerHTML = `<tr class="empty-row"><td colspan="3">No students added yet.</td></tr>`; return; }
    body.innerHTML = students.map((s) => `
      <tr>
        <td>${escapeHtml(s.fullName)}</td>
        <td class="mono">${s.studentNumber}</td>
        <td><button class="btn btn-danger btn-sm" data-remove="${s.studentNumber}">Remove</button></td>
      </tr>`).join("");

    body.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Remove this student from the roster? Their attendance history will be kept.")) {
          await FDB.removeStudent(btn.dataset.remove);
        }
      });
    });
  }

  document.getElementById("addStudentForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("newName").value.trim();
    const number = document.getElementById("newNumber").value.trim();
    const alertBox = document.getElementById("addAlert");

    if (!/^\d{10}$/.test(number)) { alertBox.innerHTML = `<div class="alert alert-error">⚠ Student number must be exactly 10 digits.</div>`; return; }

    const result = await FDB.addStudent(name, number);
    if (!result.ok) { alertBox.innerHTML = `<div class="alert alert-error">⚠ ${result.message}</div>`; return; }
    alertBox.innerHTML = `<div class="alert alert-success">✓ ${escapeHtml(name)} added — they can log in from any device now.</div>`;
    document.getElementById("addStudentForm").reset();
  });

  /* ----------------------------------- code -------------------------------------- */
  function renderCode() {
    const active = currentCode && currentCode.date === FDB.todayStr();
    document.getElementById("currentCodeDisplay").textContent = active ? currentCode.code : "····";
    document.getElementById("codeMeta").textContent = active ? `generated at ${currentCode.time} · valid today only` : "no code generated yet";
  }

  document.getElementById("generateBtn").addEventListener("click", async () => {
    await FDB.generateCode();
  });

  /* -------------------------------- announcements ---------------------------------- */
  function renderAnnouncements() {
    const box = document.getElementById("annList");
    if (announcements.length === 0) { box.innerHTML = `<p class="muted">No announcements posted yet.</p>`; return; }
    box.innerHTML = announcements.map((a) => `
      <div class="list-item">
        <div class="row-between">
          <span class="mono muted">${a.date} · ${a.time}</span>
          <button class="btn btn-danger btn-sm" data-del-ann="${a.id}">Delete</button>
        </div>
        <div style="font-size:14px;">${escapeHtml(a.text)}</div>
      </div>`).join("");

    box.querySelectorAll("[data-del-ann]").forEach((btn) => {
      btn.addEventListener("click", () => FDB.removeAnnouncement(btn.dataset.delAnn));
    });
  }

  document.getElementById("annForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = document.getElementById("annText").value.trim();
    if (text.length < 3) return;
    await FDB.addAnnouncement(text);
    document.getElementById("annText").value = "";
    document.getElementById("annAlert").innerHTML = `<div class="alert alert-success">✓ Announcement published.</div>`;
  });

  /* ---------------------------------- excuses ----------------------------------- */
  function renderExcuses() {
    const box = document.getElementById("excusesList");
    if (excuses.length === 0) { box.innerHTML = `<p class="muted">No excuse letters submitted yet.</p>`; return; }
    box.innerHTML = excuses.map((ex) => `
      <div class="list-item">
        <div class="row-between">
          <div><b>${escapeHtml(ex.fullName)}</b><span class="mono muted"> · ${ex.studentNumber}</span></div>
          <span class="badge ${ex.status === "pending" ? "badge-pending" : "badge-reviewed"}"><span class="dot"></span>${ex.status}</span>
        </div>
        <div class="mono muted" style="font-size:12px; margin-bottom:8px;">${ex.date} · ${ex.time}</div>
        <div style="font-size:14px; margin-bottom:10px;">${escapeHtml(ex.message)}</div>
        ${ex.status === "pending" ? `<button class="btn btn-sm" data-review="${ex.id}">Mark reviewed</button>` : ""}
      </div>`).join("");

    box.querySelectorAll("[data-review]").forEach((btn) => {
      btn.addEventListener("click", () => FDB.markExcuseReviewed(btn.dataset.review));
    });
  }

  /* -------------------------------- start listeners -------------------------------- */
  function startListeners() {
    FDB.listenStudents((list) => { students = list; renderRoster(); renderStats(); });
    FDB.listenAttendanceToday((list) => { attendanceToday = list; renderToday(); renderLogFeed(); renderStats(); });
    FDB.listenAttendanceHistory((list) => { historyGroups = list; renderHistory(); });
    FDB.listenCode((code) => { currentCode = code; renderCode(); renderStats(); });
    FDB.listenAnnouncements((list) => { announcements = list; renderAnnouncements(); });
    FDB.listenAllExcuses((list) => { excuses = list; renderExcuses(); renderStats(); });
  }
})();
