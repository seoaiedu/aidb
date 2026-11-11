import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  doc,
  setDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from "./firebase-config.js";

// DOM 요소 참조
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const userBar = document.getElementById("user-bar");
const userNameEl = document.getElementById("user-name");
const userEmailEl = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");

const tabLogin = document.getElementById("tab-login");
const tabSignup = document.getElementById("tab-signup");
const signupNameGroup = document.getElementById("signup-name-group");
const authDisplayNameInput = document.getElementById("auth-display-name");
const emailAuthForm = document.getElementById("email-auth-form");
const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const authErrorEl = document.getElementById("auth-error");
const emailSubmitBtn = document.getElementById("email-submit-btn");
const googleLoginBtn = document.getElementById("google-login-btn");

const firestorePathBadge = document.getElementById("firestore-path-badge");
const todayDateLabel = document.getElementById("today-date-label");
const quickCheckinBtn = document.getElementById("quick-checkin-btn");

const statTotal = document.getElementById("stat-total");
const statPresent = document.getElementById("stat-present");
const statLate = document.getElementById("stat-late");
const statAbsent = document.getElementById("stat-absent");
const statRate = document.getElementById("stat-rate");

const addAttendanceForm = document.getElementById("add-attendance-form");
const attDateInput = document.getElementById("att-date");
const attNameInput = document.getElementById("att-name");
const attStatusInput = document.getElementById("att-status");
const attTimeInput = document.getElementById("att-time");
const attNoteInput = document.getElementById("att-note");

const filterDateInput = document.getElementById("filter-date");
const filterStatusInput = document.getElementById("filter-status");
const filterSearchInput = document.getElementById("filter-search");
const resetFilterBtn = document.getElementById("reset-filter-btn");
const attendanceListEl = document.getElementById("attendance-list");

const editModal = document.getElementById("edit-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const editAttendanceForm = document.getElementById("edit-attendance-form");
const editIdInput = document.getElementById("edit-id");
const editDateInput = document.getElementById("edit-date");
const editNameInput = document.getElementById("edit-name");
const editStatusInput = document.getElementById("edit-status");
const editTimeInput = document.getElementById("edit-time");
const editNoteInput = document.getElementById("edit-note");

const toastEl = document.getElementById("toast");

// 상태 변수
let authMode = "login"; // 'login' | 'signup'
let currentUser = null;
let unsubscribeSnapshot = null;
let attendanceRecords = [];
let toastTimer = null;

const STATUS_LABELS = {
  present: "출석",
  late: "지각",
  absent: "결석",
  excused: "공결"
};

// 현재 로컬 날짜/시간 포맷 도우미
function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getCurrentTimeString() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function initDefaultFormDateTime() {
  const today = getTodayDateString();
  attDateInput.value = today;
  attTimeInput.value = getCurrentTimeString();
  todayDateLabel.textContent = `오늘의 출석 체크 (${today})`;
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove("hidden");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.add("hidden");
  }, 2800);
}

function showAuthError(message) {
  if (!message) {
    authErrorEl.textContent = "";
    authErrorEl.classList.add("hidden");
    return;
  }
  authErrorEl.textContent = message;
  authErrorEl.classList.remove("hidden");
}

function formatFirebaseAuthError(error) {
  const code = error?.code || "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    case "auth/email-already-in-use":
      return "이미 가입된 이메일 주소입니다. 로그인 탭을 이용해 주세요.";
    case "auth/weak-password":
      return "비밀번호는 최소 6자 이상이어야 합니다.";
    case "auth/invalid-email":
      return "유효한 이메일 주소를 입력해 주세요.";
    case "auth/popup-closed-by-user":
      return "Google 로그인 창이 닫혔습니다.";
    case "auth/unauthorized-domain":
      return "현재 도메인이 Firebase 승인된 도메인에 등록되어 있지 않습니다. Firebase 콘솔 > Authentication > Settings > 승인된 도메인에 현재 도메인을 추가해 주세요.";
    default:
      return error?.message || "인증 중 오류가 발생했습니다.";
  }
}

// 1. 로그인 / 회원가입 탭 전환
function setAuthMode(mode) {
  authMode = mode;
  showAuthError("");
  if (mode === "login") {
    tabLogin.classList.add("active");
    tabSignup.classList.remove("active");
    signupNameGroup.classList.add("hidden");
    emailSubmitBtn.textContent = "이메일로 로그인";
    authPasswordInput.setAttribute("autocomplete", "current-password");
  } else {
    tabSignup.classList.add("active");
    tabLogin.classList.remove("active");
    signupNameGroup.classList.remove("hidden");
    emailSubmitBtn.textContent = "이메일로 회원가입";
    authPasswordInput.setAttribute("autocomplete", "new-password");
  }
}

tabLogin.addEventListener("click", () => setAuthMode("login"));
tabSignup.addEventListener("click", () => setAuthMode("signup"));

// 2. 이메일/패스워드 로그인 및 회원가입 처리
emailAuthForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  showAuthError("");
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  const displayName = authDisplayNameInput.value.trim();

  emailSubmitBtn.disabled = true;
  try {
    if (authMode === "login") {
      await signInWithEmailAndPassword(auth, email, password);
      showToast("로그인되었습니다.");
    } else {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
      await syncUserDocument(cred.user, displayName);
      showToast("회원가입 및 로그인이 완료되었습니다!");
    }
    emailAuthForm.reset();
  } catch (err) {
    showAuthError(formatFirebaseAuthError(err));
  } finally {
    emailSubmitBtn.disabled = false;
  }
});

// 3. Google 로그인 처리
googleLoginBtn.addEventListener("click", async () => {
  showAuthError("");
  googleLoginBtn.disabled = true;
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    await syncUserDocument(cred.user);
    showToast("Google 계정으로 로그인되었습니다.");
  } catch (err) {
    showAuthError(formatFirebaseAuthError(err));
  } finally {
    googleLoginBtn.disabled = false;
  }
});

// 4. 로그아웃 처리
logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    showToast("로그아웃되었습니다.");
  } catch (err) {
    showToast("로그아웃 중 오류가 발생했습니다.");
  }
});

// Firestore: users/{userId} 문서에 사용자 기본 정보 저장/업데이트
async function syncUserDocument(user, customName = "") {
  if (!user) return;
  const userDocRef = doc(db, "users", user.uid);
  await setDoc(
    userDocRef,
    {
      uid: user.uid,
      email: user.email || "",
      displayName: customName || user.displayName || (user.email ? user.email.split("@")[0] : "사용자"),
      lastLoginAt: serverTimestamp()
    },
    { merge: true }
  );
}

// 5. 인증 상태 감지 및 해당 사용자(users/{userId})의 출석 데이터 실시간 구독
onAuthStateChanged(auth, async (user) => {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }

  currentUser = user;

  if (!user) {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    userBar.classList.add("hidden");
    attendanceRecords = [];
    renderAttendanceList();
    updateStats();
    return;
  }

  // 로그인 상태 UI 전환
  const displayName = user.displayName || (user.email ? user.email.split("@")[0] : "사용자");
  userNameEl.textContent = displayName;
  userEmailEl.textContent = user.email || "";
  firestorePathBadge.textContent = `Firestore: users/${user.uid}/attendances`;

  authSection.classList.add("hidden");
  appSection.classList.remove("hidden");
  userBar.classList.remove("hidden");

  initDefaultFormDateTime();
  if (!attNameInput.value) {
    attNameInput.value = displayName;
  }

  // users/{userId} 기본 문서 동기화
  try {
    await syncUserDocument(user);
  } catch (err) {
    console.warn("사용자 문서 동기화 경고:", err);
  }

  // users/{userId}/attendances 실시간 리스너 연결
  const userAttendancesRef = collection(db, "users", user.uid, "attendances");
  unsubscribeSnapshot = onSnapshot(
    userAttendancesRef,
    (snapshot) => {
      attendanceRecords = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      // 최신 날짜 및 시간 순으로 정렬
      attendanceRecords.sort((a, b) => {
        const dateCompare = (b.date || "").localeCompare(a.date || "");
        if (dateCompare !== 0) return dateCompare;
        return (b.checkInTime || "").localeCompare(a.checkInTime || "");
      });

      updateStats();
      renderAttendanceList();
    },
    (error) => {
      console.error("Firestore 구독 오류:", error);
      showToast("데이터를 불러오는 중 권한 또는 네트워크 오류가 발생했습니다.");
    }
  );
});

// 6. 출석 데이터 추가 (Create) -> users/{userId}/attendances 및 users/{userId} 요약 갱신
async function createAttendanceRecord({ date, name, status, checkInTime, note }) {
  if (!currentUser) return;
  const uid = currentUser.uid;
  const userAttendancesRef = collection(db, "users", uid, "attendances");

  await addDoc(userAttendancesRef, {
    userId: uid,
    date,
    name,
    status,
    checkInTime,
    note: note || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  // 상위 users/{userId} 문서에도 최근 활동 시간 업데이트
  const userDocRef = doc(db, "users", uid);
  await setDoc(
    userDocRef,
    {
      updatedAt: serverTimestamp(),
      lastAttendanceDate: date,
      lastAttendanceStatus: status
    },
    { merge: true }
  );
}

addAttendanceForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const date = attDateInput.value;
  const name = attNameInput.value.trim();
  const status = attStatusInput.value;
  const checkInTime = attTimeInput.value;
  const note = attNoteInput.value.trim();

  if (!date || !name || !checkInTime) {
    showToast("날짜, 이름/과정명, 시간을 모두 입력해 주세요.");
    return;
  }

  try {
    await createAttendanceRecord({ date, name, status, checkInTime, note });
    attNoteInput.value = "";
    attTimeInput.value = getCurrentTimeString();
    showToast("출석 기록이 저장되었습니다.");
  } catch (err) {
    console.error("출석 추가 오류:", err);
    showToast("출석 저장 중 오류가 발생했습니다.");
  }
});

// 원클릭 오늘 출석하기 버튼
quickCheckinBtn.addEventListener("click", async () => {
  if (!currentUser) return;
  const today = getTodayDateString();
  const nowTime = getCurrentTimeString();
  const defaultName =
    currentUser.displayName ||
    (currentUser.email ? currentUser.email.split("@")[0] : "본인 출석");

  quickCheckinBtn.disabled = true;
  try {
    await createAttendanceRecord({
      date: today,
      name: defaultName,
      status: "present",
      checkInTime: nowTime,
      note: "원클릭 오늘 출석 체크"
    });
    showToast(`${today} (${nowTime}) 오늘 출석이 완료되었습니다!`);
  } catch (err) {
    console.error("원클릭 출석 오류:", err);
    showToast("출석 처리 중 오류가 발생했습니다.");
  } finally {
    quickCheckinBtn.disabled = false;
  }
});

// 7. 출석 데이터 수정 (Update)
function openEditModal(record) {
  editIdInput.value = record.id;
  editDateInput.value = record.date || getTodayDateString();
  editNameInput.value = record.name || "";
  editStatusInput.value = record.status || "present";
  editTimeInput.value = record.checkInTime || getCurrentTimeString();
  editNoteInput.value = record.note || "";
  editModal.classList.remove("hidden");
}

function closeEditModal() {
  editModal.classList.add("hidden");
  editAttendanceForm.reset();
}

closeModalBtn.addEventListener("click", closeEditModal);
cancelEditBtn.addEventListener("click", closeEditModal);
editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeEditModal();
});

editAttendanceForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const recordId = editIdInput.value;
  const date = editDateInput.value;
  const name = editNameInput.value.trim();
  const status = editStatusInput.value;
  const checkInTime = editTimeInput.value;
  const note = editNoteInput.value.trim();

  if (!recordId || !date || !name || !checkInTime) return;

  try {
    const recordRef = doc(db, "users", currentUser.uid, "attendances", recordId);
    await updateDoc(recordRef, {
      date,
      name,
      status,
      checkInTime,
      note,
      updatedAt: serverTimestamp()
    });
    closeEditModal();
    showToast("출석 기록이 수정되었습니다.");
  } catch (err) {
    console.error("출석 수정 오류:", err);
    showToast("출석 수정 중 오류가 발생했습니다.");
  }
});

// 8. 출석 데이터 삭제 (Delete)
async function deleteAttendanceRecord(recordId) {
  if (!currentUser || !recordId) return;
  try {
    const recordRef = doc(db, "users", currentUser.uid, "attendances", recordId);
    await deleteDoc(recordRef);
    showToast("출석 기록이 삭제되었습니다.");
  } catch (err) {
    console.error("출석 삭제 오류:", err);
    showToast("삭제 중 오류가 발생했습니다.");
  }
}

// 9. 통계 업데이트 및 목록 렌더링
function updateStats() {
  const total = attendanceRecords.length;
  const presentCount = attendanceRecords.filter((r) => r.status === "present").length;
  const lateCount = attendanceRecords.filter((r) => r.status === "late").length;
  const absentOrExcusedCount = attendanceRecords.filter(
    (r) => r.status === "absent" || r.status === "excused"
  ).length;

  const rate = total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : 0;

  statTotal.textContent = String(total);
  statPresent.textContent = String(presentCount);
  statLate.textContent = String(lateCount);
  statAbsent.textContent = String(absentOrExcusedCount);
  statRate.textContent = `${rate}%`;
}

function renderAttendanceList() {
  const dateFilter = filterDateInput.value;
  const statusFilter = filterStatusInput.value;
  const searchKeyword = filterSearchInput.value.trim().toLowerCase();

  const filtered = attendanceRecords.filter((item) => {
    if (dateFilter && item.date !== dateFilter) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (searchKeyword) {
      const target = `${item.name || ""} ${item.note || ""} ${item.date || ""}`.toLowerCase();
      if (!target.includes(searchKeyword)) return false;
    }
    return true;
  });

  attendanceListEl.innerHTML = "";

  if (filtered.length === 0) {
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "empty-state";
    emptyDiv.innerHTML = `
      <p>표시할 출석 기록이 없습니다.</p>
      <small>상단의 '오늘 바로 출석하기' 또는 좌측 폼에서 새로운 출석 데이터를 추가해 보세요.</small>
    `;
    attendanceListEl.appendChild(emptyDiv);
    return;
  }

  filtered.forEach((record) => {
    const itemEl = document.createElement("div");
    itemEl.className = "attendance-item";

    const statusKey = STATUS_LABELS[record.status] ? record.status : "present";
    const statusText = STATUS_LABELS[statusKey];

    const mainDiv = document.createElement("div");
    mainDiv.className = "att-main";

    const badgeSpan = document.createElement("span");
    badgeSpan.className = `status-badge status-${statusKey}`;
    badgeSpan.textContent = statusText;

    const detailsDiv = document.createElement("div");
    detailsDiv.className = "att-details";

    const titleRow = document.createElement("div");
    titleRow.className = "att-title-row";

    const nameSpan = document.createElement("span");
    nameSpan.className = "att-name";
    nameSpan.textContent = record.name || "이름 없음";

    const metaSpan = document.createElement("span");
    metaSpan.className = "att-meta";
    metaSpan.textContent = `${record.date || "-"} · ${record.checkInTime || "-"}`;

    titleRow.appendChild(nameSpan);
    titleRow.appendChild(metaSpan);
    detailsDiv.appendChild(titleRow);

    if (record.note) {
      const noteP = document.createElement("p");
      noteP.className = "att-note";
      noteP.textContent = record.note;
      detailsDiv.appendChild(noteP);
    }

    mainDiv.appendChild(badgeSpan);
    mainDiv.appendChild(detailsDiv);

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "att-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-outline btn-sm";
    editBtn.textContent = "수정";
    editBtn.addEventListener("click", () => openEditModal(record));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-danger btn-sm";
    deleteBtn.textContent = "삭제";
    deleteBtn.addEventListener("click", () => {
      if (confirm(`'${record.name}' (${record.date}) 출석 기록을 삭제하시겠습니까?`)) {
        deleteAttendanceRecord(record.id);
      }
    });

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);

    itemEl.appendChild(mainDiv);
    itemEl.appendChild(actionsDiv);
    attendanceListEl.appendChild(itemEl);
  });
}

// 필터 이벤트 연결
filterDateInput.addEventListener("change", renderAttendanceList);
filterStatusInput.addEventListener("change", renderAttendanceList);
filterSearchInput.addEventListener("input", renderAttendanceList);
resetFilterBtn.addEventListener("click", () => {
  filterDateInput.value = "";
  filterStatusInput.value = "all";
  filterSearchInput.value = "";
  renderAttendanceList();
});

initDefaultFormDateTime();

