(async function () {
  const student = FDB.currentStudent();
  if (!student) { window.location.href = "student-login.html"; return; }

  await FDB.ensureAnonAuth();

  document.getElementById("nameHeading").textContent = student.fullName.split(" ")[0];
  document.getElementById("whoBadge").textContent = `◆ ${student.fullName}`;
  document.getElementById("dateLine").textContent = FDB.prettyDate(FDB.todayStr());

  document.getElementById("logoutBtn").addEventListener("click", () => {
    FDB.studentLogout();
    window.location.href = "index.html";
  });

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ------------------------------ check-in state ------------------------------- */
  let alreadyPresentToday = false;
  let todayTime = null;

  function renderStatus() {
    const statusArea = document.getElementById("statusArea");
    const codeForm = document.getElementById("codeForm");
    if (alreadyPresentToday) {
      statusArea.innerHTML = `
        <div class="code-display" style="font-size:28px; letter-spacing:2px;">✓ PRESENT</div>
        <div class="meta">marked today at ${todayTime || ""}</div>`;
      codeForm.style.display = "none";
    } else {
      statusArea.innerHTML = `
        <div class="code-display">····</div>
        <div class="meta">enter today's 4-digit code below</div>`;
      codeForm.style.display = "block";
    }
  }

  document.getElementById("codeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById("checkinAlert");
    const input = document.getElementById("codeInput").value.trim();
    const btn = document.getElementById("submitCodeBtn");

    if (!/^\d{4}$/.test(input)) {
      alertBox.innerHTML = `<div class="alert alert-error">⚠ Enter the 4-digit code exactly as shown by your admin.</div>`;
      return;
    }
    btn.disabled = true;
    btn.textContent = "Checking...";
    try {
      const result = await FDB.checkCodeAndMark(student.studentNumber, student.fullName, input);
      if (!result.ok) {
        alertBox.innerHTML = `<div class="alert alert-error">⚠ ${result.message}</div>`;
      } else {
        alertBox.innerHTML = `<div class="alert alert-success">✓ You're marked present today.</div>`;
      }
    } catch (err) {
      alertBox.innerHTML = `<div class="alert alert-error">⚠ Connection problem. Please try again.</div>`;
    }
    btn.disabled = false;
    btn.textContent = "Mark me present";
  });

  /* -------------------------------- excuse letter --------------------------------- */
  document.getElementById("excuseForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("excuseMsg").value.trim();
    const alertBox = document.getElementById("excuseAlert");
    if (msg.length < 5) {
      alertBox.innerHTML = `<div class="alert alert-error">⚠ Please write a short explanation.</div>`;
      return;
    }
    await FDB.addExcuse(student.studentNumber, student.fullName, msg);
    document.getElementById("excuseMsg").value = "";
    alertBox.innerHTML = `<div class="alert alert-success">✓ Sent privately to your admin.</div>`;
  });

  function renderMyExcuses(list) {
    const box = document.getElementById("myExcuses");
    if (list.length === 0) { box.innerHTML = ""; return; }
    box.innerHTML =
      `<div class="muted" style="margin-bottom:10px;">Your submitted letters (this device)</div>` +
      list.map(e => `
        <div class="list-item">
          <div class="row-between">
            <span class="mono muted">${e.date} · ${e.time}</span>
            <span class="badge ${e.status === "pending" ? "badge-pending" : "badge-reviewed"}"><span class="dot"></span>${e.status}</span>
          </div>
          <div style="font-size:14px;">${escapeHtml(e.message)}</div>
        </div>`).join("");
  }

  /* -------------------------------- announcements ---------------------------------- */
  function renderAnnouncements(list) {
    const box = document.getElementById("announcementsList");
    if (list.length === 0) { box.innerHTML = `<p class="muted">No announcements yet. Check back later.</p>`; return; }
    box.innerHTML = list.map(a => `
      <div class="list-item">
        <div class="row-between"><span class="mono muted">${a.date} · ${a.time}</span></div>
        <div style="font-size:14px;">${escapeHtml(a.text)}</div>
      </div>`).join("");
  }

  /* ----------------------------------- history ------------------------------------- */
  function renderHistory(rows) {
    const body = document.getElementById("historyBody");
    if (rows.length === 0) { body.innerHTML = `<tr class="empty-row"><td colspan="3">No attendance recorded yet.</td></tr>`; return; }
    body.innerHTML = rows.map(r => `
      <tr>
        <td class="mono">${r.date}</td>
        <td class="mono">${r.time}</td>
        <td><span class="badge badge-present"><span class="dot"></span>present</span></td>
      </tr>`).join("");
  }

  /* -------------------------------- realtime listeners ------------------------------ */
  FDB.listenStudentHistory(student.studentNumber, (rows) => {
    renderHistory(rows);
    const today = rows.find(r => r.date === FDB.todayStr());
    alreadyPresentToday = !!today;
    todayTime = today ? today.time : null;
    renderStatus();
  });

  FDB.listenAnnouncements(renderAnnouncements);
  FDB.listenMyExcuses(renderMyExcuses);

  renderStatus();
})();
