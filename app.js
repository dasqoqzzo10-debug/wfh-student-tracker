// --- WFH Attendance System State Manager (Cloud D1 & Local Storage Fallback) ---

let profiles = [];
let activeProfileIndex = -1;
let currentCalendarDate = new Date();

// Supervisor Role State
let userRole = 'student'; // 'student' or 'supervisor'
let supervisorPin = '1234';
let supervisorName = 'นายสมศักดิ์ รักมั่น (พี่เลี้ยง)';
let supervisorSignature = 'สมศักดิ์ ร.';
let selectedSvStudentIndex = 0;
let isCloudMode = false; // Flag to indicate if connected to Cloud D1 database

// DOM Elements
const bodyEl = document.body;
const sidebarProfileBox = document.getElementById('sidebarProfileBox');
const studentNav = document.getElementById('studentNav');
const supervisorNav = document.getElementById('supervisorNav');
const currentStudentDisplay = document.getElementById('currentStudentDisplay');
const pageTitle = document.getElementById('pageTitle');

// Role Switcher Buttons
const btnRoleStudent = document.getElementById('btnRoleStudent');
const btnRoleSupervisor = document.getElementById('btnRoleSupervisor');

// Student Views Elements
const profileSelect = document.getElementById('profileSelect');
const btnNewProfile = document.getElementById('btnNewProfile');
const btnPromptCreate = document.getElementById('btnPromptCreate');
const noProfilePrompt = document.getElementById('noProfilePrompt');
const dashboardGrid = document.getElementById('dashboardGrid');
const studentInfoBanner = document.getElementById('studentInfoBanner');

// Banner details
const infoStudentId = document.getElementById('infoStudentId');
const infoStudentName = document.getElementById('infoStudentName');
const infoStudentAdvisor = document.getElementById('infoStudentAdvisor');
const infoStudentDept = document.getElementById('infoStudentDept');
const btnEditProfile = document.getElementById('btnEditProfile');

// Clock Elements
const liveTime = document.getElementById('liveTime');
const liveDate = document.getElementById('liveDate');
const headerDate = document.getElementById('headerDate');
const clockStatusBadge = document.getElementById('clockStatusBadge');
const clockNote = document.getElementById('clockNote');
const btnClockIn = document.getElementById('btnClockIn');
const btnClockOut = document.getElementById('btnClockOut');

// Manual Entry Elements
const manualEntryForm = document.getElementById('manualEntryForm');
const entryDate = document.getElementById('entryDate');
const entryInTime = document.getElementById('entryInTime');
const entryOutTime = document.getElementById('entryOutTime');
const entryNote = document.getElementById('entryNote');

// Stats Elements
const statTotalDays = document.getElementById('statTotalDays');
const statTotalHours = document.getElementById('statTotalHours');
const statAvgHours = document.getElementById('statAvgHours');

// Calendar Elements
const calendarMonthTitle = document.getElementById('calendarMonthTitle');
const calendarDays = document.getElementById('calendarDays');
const btnPrevMonth = document.getElementById('btnPrevMonth');
const btnNextMonth = document.getElementById('btnNextMonth');

// History Table & Filters Elements
const filterMonth = document.getElementById('filterMonth');
const searchTask = document.getElementById('searchTask');
const historyTableBody = document.getElementById('historyTableBody');
const logCountBadge = document.getElementById('logCountBadge');
const btnExportCSV = document.getElementById('btnExportCSV');
const btnPrintReport = document.getElementById('btnPrintReport');

// Backup/Restore
const btnBackup = document.getElementById('btnBackup');
const btnRestore = document.getElementById('btnRestore');
const fileRestore = document.getElementById('fileRestore');

// Student Profile Modal Elements
const profileModal = document.getElementById('profileModal');
const profileForm = document.getElementById('profileForm');
const modalTitle = document.getElementById('modalTitle');
const editProfileIndex = document.getElementById('editProfileIndex');
const studentId = document.getElementById('studentId');
const studentName = document.getElementById('studentName');
const studentDept = document.getElementById('studentDept');
const studentAdvisor = document.getElementById('studentAdvisor');
const studentCompany = document.getElementById('studentCompany');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnCancelModal = document.getElementById('btnCancelModal');
const btnDeleteProfile = document.getElementById('btnDeleteProfile');

// Supervisor PIN Modal Elements
const pinModal = document.getElementById('pinModal');
const pinForm = document.getElementById('pinForm');
const inputPinCode = document.getElementById('inputPinCode');
const btnCancelPin = document.getElementById('btnCancelPin');
const btnCancelPinBack = document.getElementById('btnCancelPinBack');

// Supervisor Reject Feedback Modal
const rejectModal = document.getElementById('rejectModal');
const rejectForm = document.getElementById('rejectForm');
const rejectLogDate = document.getElementById('rejectLogDate');
const rejectReason = document.getElementById('rejectReason');
const btnCancelReject = document.getElementById('btnCancelReject');
const btnCancelRejectBack = document.getElementById('btnCancelRejectBack');

// Supervisor Dashboard Panel
const svStudentSelect = document.getElementById('svStudentSelect');
const btnApproveAll = document.getElementById('btnApproveAll');
const svStatTotalHours = document.getElementById('svStatTotalHours');
const svStatApprovedHours = document.getElementById('svStatApprovedHours');
const svStatPendingHours = document.getElementById('svStatPendingHours');
const svApprovalTableBody = document.getElementById('svApprovalTableBody');
const svLogCountBadge = document.getElementById('svLogCountBadge');

// Supervisor Settings Page Forms
const changePinForm = document.getElementById('changePinForm');
const currentPin = document.getElementById('currentPin');
const newPin = document.getElementById('newPin');
const confirmNewPin = document.getElementById('confirmNewPin');

const signatureForm = document.getElementById('signatureForm');
const svNameDisplay = document.getElementById('svNameDisplay');
const svSignatureText = document.getElementById('svSignatureText');

// Theme Switcher
const themeToggle = document.getElementById('themeToggle');

// --- Initializing App ---
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    setupClock();
    registerEventListeners();
    
    // Set default date for manual entry to today
    entryDate.value = getLocalDateString(new Date());

    // Load Data from Cloud D1 Database or fall back to LocalStorage
    await loadDataRouter();
});

// --- Theme Management ---
function initTheme() {
    const savedTheme = localStorage.getItem('wfh_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.body.classList.remove('dark-theme');
        themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
}

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('wfh_theme', isDark ? 'dark' : 'light');
    themeToggle.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
});

// --- Data Router (Cloud API with LocalStorage Fallback) ---
async function loadDataRouter() {
    showLoadingSpinner(true);
    try {
        // Try fetching settings first
        const settingsRes = await fetch('/api/pin');
        if (!settingsRes.ok) throw new Error("API Settings endpoint failed");
        
        const settings = await settingsRes.json();
        supervisorName = settings.supervisorName;
        supervisorSignature = settings.supervisorSignature;
        svNameDisplay.value = supervisorName;
        svSignatureText.value = supervisorSignature;

        // Fetch student profiles
        const profilesRes = await fetch('/api/profiles');
        if (!profilesRes.ok) throw new Error("API Profiles endpoint failed");
        
        profiles = await profilesRes.json();
        
        // Fetch logs for all profiles
        for (let profile of profiles) {
            const logsRes = await fetch(`/api/logs?studentId=${profile.id}`);
            if (logsRes.ok) {
                profile.logs = await logsRes.json();
            } else {
                profile.logs = [];
            }
        }

        // Setup active index
        const storedActiveIndex = localStorage.getItem('wfh_active_profile_index');
        if (storedActiveIndex !== null) {
            activeProfileIndex = parseInt(storedActiveIndex, 10);
            if (activeProfileIndex >= profiles.length || activeProfileIndex < 0) {
                activeProfileIndex = profiles.length > 0 ? 0 : -1;
            }
        } else if (profiles.length > 0) {
            activeProfileIndex = 0;
        }

        isCloudMode = true;
        console.log("Connected to Cloudflare D1 Database successfully!");
    } catch (err) {
        console.warn("Could not connect to Cloud D1 database, falling back to browser LocalStorage:", err.message);
        isCloudMode = false;
        loadLocalStorageFallback();
    } finally {
        showLoadingSpinner(false);
        renderProfileDropdown();
        updateUIVisibility();
    }
}

// Fallback function for LocalStorage
function loadLocalStorageFallback() {
    const storedProfiles = localStorage.getItem('wfh_student_profiles');
    if (storedProfiles) {
        try {
            profiles = JSON.parse(storedProfiles);
        } catch (e) {
            profiles = [];
        }
    } else {
        profiles = [
            {
                id: "6601012301",
                name: "นายกรวิชญ์ รักเรียน (ข้อมูลในเครื่อง)",
                dept: "วิทยาการคอมพิวเตอร์",
                advisor: "อาจารย์กิตติพงษ์ สุขใจ",
                company: "บริษัท เทคโนโลยีและนวัตกรรม จำกัด",
                logs: []
            },
            {
                id: "6601012302",
                name: "นางสาวศิริพร บุญรอด (ข้อมูลในเครื่อง)",
                dept: "เทคโนโลยีสารสนเทศ",
                advisor: "อาจารย์กิตติพงษ์ สุขใจ",
                company: "บริษัท เทคโนโลยีและนวัตกรรม จำกัด",
                logs: []
            },
            {
                id: "6601012303",
                name: "นายปกรณ์ มีทรัพย์ (ข้อมูลในเครื่อง)",
                dept: "วิศวกรรมคอมพิวเตอร์",
                advisor: "ดร.สมชาย สอนดี",
                company: "บริษัท พัฒนาซอฟต์แวร์ จำกัด",
                logs: []
            }
        ];
        localStorage.setItem('wfh_student_profiles', JSON.stringify(profiles));
    }

    const storedActiveIndex = localStorage.getItem('wfh_active_profile_index');
    if (storedActiveIndex !== null) {
        activeProfileIndex = parseInt(storedActiveIndex, 10);
        if (activeProfileIndex >= profiles.length || activeProfileIndex < 0) {
            activeProfileIndex = profiles.length > 0 ? 0 : -1;
        }
    } else if (profiles.length > 0) {
        activeProfileIndex = 0;
    }

    // Load Local supervisor configs
    const storedPin = localStorage.getItem('wfh_supervisor_pin');
    if (storedPin) supervisorPin = storedPin;

    const storedSvName = localStorage.getItem('wfh_supervisor_name');
    if (storedSvName) supervisorName = storedSvName;
    svNameDisplay.value = supervisorName;

    const storedSvSig = localStorage.getItem('wfh_supervisor_sig');
    if (storedSvSig) supervisorSignature = storedSvSig;
    svSignatureText.value = supervisorSignature;
}

function saveLocalData() {
    if (!isCloudMode) {
        localStorage.setItem('wfh_student_profiles', JSON.stringify(profiles));
        localStorage.setItem('wfh_active_profile_index', activeProfileIndex);
    }
}

// Show SweetAlert Loading Spinner
function showLoadingSpinner(show) {
    if (show) {
        Swal.fire({
            title: 'กำลังเชื่อมต่อคลาวด์ D1...',
            text: 'กรุณารอสักครู่',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    } else {
        Swal.close();
    }
}

// Helper to pull fresh logs data for current student
async function refreshLogs() {
    if (activeProfileIndex < 0) return;
    const student = profiles[activeProfileIndex];
    if (isCloudMode) {
        try {
            const logsRes = await fetch(`/api/logs?studentId=${student.id}`);
            if (logsRes.ok) {
                student.logs = await logsRes.json();
            }
        } catch (e) {
            console.error("Failed to refresh logs:", e);
        }
    }
}

// --- Live Clock Utility ---
function setupClock() {
    const monthsThai = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    const daysThai = [
        "วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"
    ];

    function updateTime() {
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        const secs = String(now.getSeconds()).padStart(2, '0');
        
        liveTime.textContent = `${hrs}:${mins}:${secs}`;
        
        const dayName = daysThai[now.getDay()];
        const dateNum = now.getDate();
        const monthName = monthsThai[now.getMonth()];
        const yearThai = now.getFullYear() + 543;
        
        liveDate.textContent = `${dayName}ที่ ${dateNum} ${monthName} พ.ศ. ${yearThai}`;
        headerDate.textContent = `${dateNum} ${monthName.substring(0, 7)} ${yearThai}`;
    }

    updateTime();
    setInterval(updateTime, 1000);
}

// --- UI Rendering Router ---
function renderProfileDropdown() {
    profileSelect.innerHTML = '<option value="" disabled selected>-- เลือกโปรไฟล์ --</option>';
    profiles.forEach((profile, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${profile.name} (${profile.id})`;
        if (index === activeProfileIndex) {
            option.selected = true;
        }
        profileSelect.appendChild(option);
    });
}

function updateUIVisibility() {
    if (userRole === 'student') {
        bodyEl.classList.remove('supervisor-active');
        sidebarProfileBox.classList.remove('hidden');
        studentNav.classList.remove('hidden');
        supervisorNav.classList.add('hidden');
        
        document.getElementById('supervisor-panel').classList.remove('active');
        document.getElementById('supervisor-settings').classList.remove('active');

        const activeNavEl = studentNav.querySelector('li.active');
        const targetSection = activeNavEl ? activeNavEl.getAttribute('data-section') : 'dashboard';
        document.getElementById(targetSection).classList.add('active');
        pageTitle.textContent = activeNavEl ? activeNavEl.querySelector('a').textContent.trim() : 'แดชบอร์ด & ลงเวลา';

        if (activeProfileIndex >= 0 && activeProfileIndex < profiles.length) {
            noProfilePrompt.classList.add('hidden');
            dashboardGrid.classList.remove('hidden');
            studentInfoBanner.classList.remove('hidden');
            
            const activeProfile = profiles[activeProfileIndex];
            
            currentStudentDisplay.textContent = `นักศึกษา: ${activeProfile.name} | รหัสนักศึกษา: ${activeProfile.id} ${isCloudMode ? '(Cloud D1)' : '(Local)'}`;
            infoStudentId.textContent = activeProfile.id;
            infoStudentName.textContent = activeProfile.name;
            infoStudentAdvisor.textContent = activeProfile.advisor || 'ไม่ได้ระบุ';
            infoStudentDept.textContent = activeProfile.dept || 'ไม่ได้ระบุ';
            
            checkTodayClockStatus();
            renderStats();
            renderCalendar();
            renderHistoryTable();
        } else {
            noProfilePrompt.classList.remove('hidden');
            dashboardGrid.classList.add('hidden');
            studentInfoBanner.classList.add('hidden');
            currentStudentDisplay.textContent = "กรุณาเลือกหรือสร้างโปรไฟล์นักศึกษาเพื่อเริ่มต้นใช้งาน";
        }
    } else {
        // Supervisor Role
        bodyEl.classList.add('supervisor-active');
        sidebarProfileBox.classList.add('hidden');
        studentNav.classList.add('hidden');
        supervisorNav.classList.remove('hidden');

        document.getElementById('dashboard').classList.remove('active');
        document.getElementById('calendar-section').classList.remove('active');
        document.getElementById('history-section').classList.remove('active');
        studentInfoBanner.classList.add('hidden');
        noProfilePrompt.classList.add('hidden');

        const activeNavEl = supervisorNav.querySelector('li.active');
        const targetSection = activeNavEl ? activeNavEl.getAttribute('data-section') : 'supervisor-panel';
        document.getElementById(targetSection).classList.add('active');
        pageTitle.textContent = activeNavEl ? activeNavEl.querySelector('a').textContent.trim() : 'จัดการตรวจสอบ & อนุมัติ';

        renderSupervisorPanel();
    }
}

// Check if user clocked in today
function checkTodayClockStatus() {
    if (activeProfileIndex < 0) return;
    
    const logs = profiles[activeProfileIndex].logs;
    const todayStr = getLocalDateString(new Date());
    const todayLog = logs.find(log => log.date === todayStr);

    if (!todayLog) {
        clockStatusBadge.textContent = "ยังไม่ได้ลงเวลาเข้า";
        clockStatusBadge.className = "badge-status checked-out";
        btnClockIn.disabled = false;
        btnClockOut.disabled = true;
        clockNote.value = "";
        clockNote.disabled = false;
    } else {
        const isApproved = todayLog.status === 'approved';
        
        if (isApproved) {
            clockStatusBadge.textContent = "ได้รับการอนุมัติแล้ว";
            clockStatusBadge.className = "badge-status approved";
            btnClockIn.disabled = true;
            btnClockOut.disabled = true;
            clockNote.value = todayLog.note || "";
            clockNote.disabled = true;
        } else if (!todayLog.clockOut) {
            clockStatusBadge.textContent = "กำลังปฏิบัติงาน (เข้างานแล้ว)";
            clockStatusBadge.className = "badge-status checked-in";
            btnClockIn.disabled = true;
            btnClockOut.disabled = false;
            clockNote.value = todayLog.note || "";
            clockNote.disabled = false;
        } else {
            clockStatusBadge.textContent = "ปฏิบัติงานเสร็จสิ้นในวันนี้";
            clockStatusBadge.className = "badge-status checked-in";
            btnClockIn.disabled = true;
            btnClockOut.disabled = true;
            clockNote.value = todayLog.note || "";
            clockNote.disabled = true;
        }
    }
}

// Compute Statistics
function renderStats() {
    if (activeProfileIndex < 0) return;
    const logs = profiles[activeProfileIndex].logs;
    
    const validLogs = logs.filter(log => log.clockIn && log.clockOut);
    const totalDays = validLogs.length;
    
    let totalHours = 0;
    validLogs.forEach(log => {
        totalHours += calculateHours(log.clockIn, log.clockOut);
    });
    
    const avgHours = totalDays > 0 ? (totalHours / totalDays) : 0;
    
    statTotalDays.textContent = logs.length;
    statTotalHours.textContent = totalHours.toFixed(1);
    statAvgHours.textContent = avgHours.toFixed(1);
}

// Calculate decimal hours
function calculateHours(inTime, outTime) {
    if (!inTime || !outTime) return 0;
    const [inH, inM] = inTime.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);
    
    let totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
    if (totalMinutes < 0) return 0;
    
    if (totalMinutes > 300) {
        totalMinutes -= 60; // D1 break
    }
    
    return totalMinutes / 60;
}

// Format date to local YYYY-MM-DD
function getLocalDateString(date) {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
}

// Thai date formatting for display
function formatThaiDate(dateStr) {
    if (!dateStr) return "-";
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    
    const year = parseInt(parts[0], 10) + 543;
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    const monthsShort = [
        "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
        "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    
    return `${day} ${monthsShort[monthIndex]} ${year}`;
}

// --- Render Interactive Calendar ---
function renderCalendar() {
    if (activeProfileIndex < 0) return;
    
    const logs = profiles[activeProfileIndex].logs;
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const monthsThai = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    
    calendarMonthTitle.textContent = `${monthsThai[month]} ${year + 543}`;
    calendarDays.innerHTML = '';
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotalDays = new Date(year, month, 0).getDate();
    
    // Render previous month cells (padding)
    for (let i = firstDayIndex; i > 0; i--) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-cell prev-next';
        const dayNum = prevTotalDays - i + 1;
        dayDiv.innerHTML = `<span class="day-num">${dayNum}</span>`;
        calendarDays.appendChild(dayDiv);
    }
    
    // Render current month cells
    for (let day = 1; day <= totalDays; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-cell';
        
        const dateObj = new Date(year, month, day);
        const dateStr = getLocalDateString(dateObj);
        const todayStr = getLocalDateString(new Date());
        
        if (dateStr === todayStr) {
            dayDiv.style.border = '2px solid var(--color-slate-blue)';
            dayDiv.style.borderRadius = '8px';
        }
        
        dayDiv.innerHTML = `<span class="day-num">${day}</span>`;
        
        const dayLog = logs.find(log => log.date === dateStr);
        if (dayLog) {
            const infoDiv = document.createElement('div');
            infoDiv.className = 'day-info';
            
            if (dayLog.clockIn) {
                const inBadge = document.createElement('span');
                inBadge.className = 'day-badge in';
                inBadge.textContent = `เข้า: ${dayLog.clockIn}`;
                infoDiv.appendChild(inBadge);
            }
            
            if (dayLog.clockOut) {
                const outBadge = document.createElement('span');
                outBadge.className = 'day-badge out';
                outBadge.textContent = `ออก: ${dayLog.clockOut}`;
                infoDiv.appendChild(outBadge);
            } else {
                const pendingBadge = document.createElement('span');
                pendingBadge.className = 'day-badge partial';
                pendingBadge.textContent = 'ยังไม่ลงออก';
                infoDiv.appendChild(pendingBadge);
            }
            dayDiv.appendChild(infoDiv);
            
            dayDiv.title = `ภาระงาน: ${dayLog.note || 'ไม่ได้ระบุ'}`;
            
            if (dayLog.status === 'approved') {
                dayDiv.style.backgroundColor = 'var(--color-mint-light)';
            } else if (dayLog.status === 'rejected') {
                dayDiv.style.backgroundColor = 'var(--color-danger-light)';
            } else {
                dayDiv.style.backgroundColor = 'var(--color-primary-light)';
            }
        }
        
        calendarDays.appendChild(dayDiv);
    }
    
    const currentCellsCount = firstDayIndex + totalDays;
    const remainingCells = 42 - currentCellsCount;
    for (let i = 1; i <= remainingCells; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-cell prev-next';
        dayDiv.innerHTML = `<span class="day-num">${i}</span>`;
        calendarDays.appendChild(dayDiv);
    }
}

// --- Render Logs Table ---
function renderHistoryTable() {
    if (activeProfileIndex < 0) return;
    
    const logs = [...profiles[activeProfileIndex].logs].reverse();
    const selectedMonthFilter = filterMonth.value;
    const searchVal = searchTask.value.toLowerCase().trim();
    
    historyTableBody.innerHTML = '';
    let filteredCount = 0;
    
    const printTableBody = document.getElementById('printTableBody');
    printTableBody.innerHTML = '';
    let printIndex = 1;
    
    const activeProfile = profiles[activeProfileIndex];
    document.getElementById('printName').textContent = activeProfile.name;
    document.getElementById('printId').textContent = activeProfile.id;
    document.getElementById('printDept').textContent = activeProfile.dept || '-';
    document.getElementById('printCompany').textContent = activeProfile.company || '-';
    document.getElementById('printAdvisor').textContent = activeProfile.advisor || '-';
    
    let printTotalHoursAccum = 0;

    logs.forEach((log) => {
        const logDateObj = new Date(log.date);
        const logMonth = logDateObj.getMonth().toString();
        
        if (selectedMonthFilter !== 'all' && logMonth !== selectedMonthFilter) return;
        if (searchVal && !log.note.toLowerCase().includes(searchVal)) return;
        
        filteredCount++;
        const hours = calculateHours(log.clockIn, log.clockOut);
        const isApproved = log.status === 'approved';
        const isRejected = log.status === 'rejected';
        
        let statusBadgeHtml = '<span class="badge-status pending"><i class="fa-solid fa-clock"></i> รอตรวจ</span>';
        if (isApproved) {
            statusBadgeHtml = '<span class="badge-status approved"><i class="fa-solid fa-circle-check"></i> อนุมัติแล้ว</span>';
        } else if (isRejected) {
            statusBadgeHtml = '<span class="badge-status rejected" title="ข้อเสนอแนะ: ' + log.feedback + '"><i class="fa-solid fa-circle-xmark"></i> ให้แก้ไข</span>';
        }

        let feedbackTextHtml = '';
        if (isRejected && log.feedback) {
            feedbackTextHtml = `<div class="feedback-comment"><i class="fa-solid fa-circle-exclamation"></i> <strong>พี่เลี้ยงให้แก้ไข:</strong> ${log.feedback}</div>`;
        } else if (isApproved && log.approvedBy) {
            feedbackTextHtml = `<div class="feedback-approved"><i class="fa-solid fa-signature"></i> รับรองเวลาโดย ${log.approvedBy}</div>`;
        }
        
        const tr = document.createElement('tr');
        const disabledAttr = isApproved ? 'disabled' : '';
        const lockIcon = isApproved ? '<i class="fa-solid fa-lock text-muted mr-1" title="อนุมัติแล้ว ล็อกข้อมูล"></i>' : '';
        
        tr.innerHTML = `
            <td class="font-semibold">${lockIcon}${formatThaiDate(log.date)}</td>
            <td><i class="fa-solid fa-right-to-bracket text-emerald-500 mr-1"></i> ${log.clockIn || '-'}</td>
            <td><i class="fa-solid fa-right-from-bracket text-sky-500 mr-1"></i> ${log.clockOut || '-'}</td>
            <td class="table-hours">${hours > 0 ? hours.toFixed(1) + ' ชม.' : '-'}</td>
            <td>${statusBadgeHtml}</td>
            <td style="white-space: pre-line;">
                ${log.note || '-'}
                ${feedbackTextHtml}
            </td>
            <td class="text-center no-print">
                <div class="table-actions">
                    <button class="btn btn-icon btn-edit-log" data-date="${log.date}" ${disabledAttr} title="แก้ไขรายการ">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn btn-icon btn-delete-log text-danger" data-date="${log.date}" ${disabledAttr} title="ลบรายการ">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </td>
        `;
        historyTableBody.appendChild(tr);

        if (isApproved) {
            printTotalHoursAccum += hours;
        }
    });
    
    const printLogs = [...profiles[activeProfileIndex].logs].sort((a, b) => new Date(a.date) - new Date(b.date));
    printLogs.forEach((log) => {
        const logDateObj = new Date(log.date);
        const logMonth = logDateObj.getMonth().toString();
        
        if (selectedMonthFilter !== 'all' && logMonth !== selectedMonthFilter) return;
        if (searchVal && !log.note.toLowerCase().includes(searchVal)) return;

        const hours = calculateHours(log.clockIn, log.clockOut);
        const isApproved = log.status === 'approved';
        
        const signCellText = isApproved ? `✔ รับรองโดย: ${log.approvedBy || supervisorSignature}` : 'รอตรวจ';

        const trPrint = document.createElement('tr');
        trPrint.innerHTML = `
            <td>${printIndex++}</td>
            <td>${formatThaiDate(log.date)}</td>
            <td>${log.clockIn || '-'}</td>
            <td>${log.clockOut || '-'}</td>
            <td>${hours > 0 ? hours.toFixed(1) : '-'}</td>
            <td style="white-space: pre-line;">${log.note || '-'}</td>
            <td style="font-weight: 500; font-size: 11px;">${signCellText}</td>
        `;
        printTableBody.appendChild(trPrint);
    });

    document.getElementById('printTotalHours').textContent = printTotalHoursAccum.toFixed(1);
    logCountBadge.textContent = `${filteredCount} รายการ`;
    
    if (filteredCount === 0) {
        historyTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-6">
                    <i class="fa-solid fa-magnifying-glass text-2xl mb-2 block"></i>
                    ไม่พบรายการลงเวลาที่ตรงตามเงื่อนไข
                </td>
            </tr>
        `;
    }
    
    document.querySelectorAll('.btn-edit-log').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const date = e.currentTarget.getAttribute('data-date');
            editLogEntry(date);
        });
    });
    
    document.querySelectorAll('.btn-delete-log').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const date = e.currentTarget.getAttribute('data-date');
            deleteLogEntry(date);
        });
    });
}

// Edit log item helper
function editLogEntry(dateStr) {
    const logs = profiles[activeProfileIndex].logs;
    const log = logs.find(l => l.date === dateStr);
    
    if (log) {
        if (log.status === 'approved') {
            Swal.fire('รายการนี้ถูกล็อก!', 'ไม่สามารถแก้ไขข้อมูลเวลาที่ผ่านการอนุมัติโดยพี่เลี้ยงได้', 'error');
            return;
        }

        entryDate.value = log.date;
        entryInTime.value = log.clockIn || '';
        entryOutTime.value = log.clockOut || '';
        entryNote.value = log.note || '';
        
        Swal.fire({
            title: 'ดึงข้อมูลลงฟอร์มแล้ว',
            text: 'ข้อมูลได้รับการกรอกลงในฟอร์ม "ลงเวลาย้อนหลัง" เรียบร้อยแล้ว สามารถแก้ไขและกดบันทึกข้อมูลเพื่ออัปเดตได้',
            icon: 'info',
            confirmButtonText: 'รับทราบ',
            confirmButtonColor: 'var(--color-slate-blue)'
        });
        
        document.querySelector('.card-manual-entry').scrollIntoView({ behavior: 'smooth' });
    }
}

// Delete log item
async function deleteLogEntry(dateStr) {
    const student = profiles[activeProfileIndex];
    const log = student.logs.find(l => l.date === dateStr);

    if (log && log.status === 'approved') {
        Swal.fire('รายการนี้ถูกล็อก!', 'ไม่สามารถลบข้อมูลเวลาที่ผ่านการอนุมัติโดยพี่เลี้ยงได้', 'error');
        return;
    }

    const result = await Swal.fire({
        title: 'ยืนยันการลบประวัติงาน?',
        text: `คุณต้องการลบข้อมูลประวัติของวันที่ ${formatThaiDate(dateStr)} หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'ยืนยันการลบ',
        cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
        showLoadingSpinner(true);
        try {
            if (isCloudMode) {
                const res = await fetch(`/api/logs?studentId=${student.id}&date=${dateStr}`, {
                    method: 'DELETE'
                });
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || "Failed to delete log in Cloud");
                }
            } else {
                student.logs = student.logs.filter(l => l.date !== dateStr);
                saveLocalData();
            }
            
            await refreshLogs();
            updateUIVisibility();
            Swal.fire('ลบข้อมูลเรียบร้อย!', '', 'success');
        } catch (err) {
            Swal.fire('เกิดข้อผิดพลาดในการลบ!', err.message, 'error');
        } finally {
            showLoadingSpinner(false);
        }
    }
}

// --- Supervisor Mode Logic & Rendering ---
function populateSvStudentDropdown() {
    svStudentSelect.innerHTML = '';
    profiles.forEach((profile, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${profile.name} (${profile.id}) - งานค้างตรวจ: ${profile.logs.filter(l => l.status !== 'approved').length} วัน`;
        if (index === selectedSvStudentIndex) {
            option.selected = true;
        }
        svStudentSelect.appendChild(option);
    });
}

function renderSupervisorPanel() {
    populateSvStudentDropdown();
    
    if (selectedSvStudentIndex < 0 || selectedSvStudentIndex >= profiles.length) {
        svApprovalTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-6">
                    <i class="fa-solid fa-users text-2xl mb-2 block"></i>
                    ไม่มีข้อมูลนักศึกษาในระบบ
                </td>
            </tr>
        `;
        return;
    }

    const studentProfile = profiles[selectedSvStudentIndex];
    const logs = [...studentProfile.logs].reverse();
    
    let totalHrs = 0;
    let approvedHrs = 0;
    let pendingHrs = 0;

    studentProfile.logs.forEach(log => {
        if (log.clockIn && log.clockOut) {
            const h = calculateHours(log.clockIn, log.clockOut);
            totalHrs += h;
            if (log.status === 'approved') {
                approvedHrs += h;
            } else {
                pendingHrs += h;
            }
        }
    });

    svStatTotalHours.textContent = totalHrs.toFixed(1);
    svStatApprovedHours.textContent = approvedHrs.toFixed(1);
    svStatPendingHours.textContent = pendingHrs.toFixed(1);

    svApprovalTableBody.innerHTML = '';
    let recordCount = 0;

    logs.forEach(log => {
        recordCount++;
        const hours = calculateHours(log.clockIn, log.clockOut);
        
        let statusBadgeHtml = '<span class="badge-status pending"><i class="fa-solid fa-hourglass-half"></i> รอการตรวจสอบ</span>';
        if (log.status === 'approved') {
            statusBadgeHtml = `<span class="badge-status approved"><i class="fa-solid fa-circle-check"></i> อนุมัติโดย ${log.approvedBy || supervisorSignature}</span>`;
        } else if (log.status === 'rejected') {
            statusBadgeHtml = `<span class="badge-status rejected" title="เหตุผล: ${log.feedback}"><i class="fa-solid fa-circle-xmark"></i> ให้กลับไปแก้</span>`;
        }

        let feedbackTextHtml = '';
        if (log.status === 'rejected' && log.feedback) {
            feedbackTextHtml = `<div class="feedback-comment"><i class="fa-solid fa-comment-dots"></i> <strong>คอมเมนต์พี่เลี้ยง:</strong> ${log.feedback}</div>`;
        }

        let actionButtonsHtml = '';
        if (log.status !== 'approved') {
            actionButtonsHtml = `
                <button class="btn btn-success btn-sm btn-sv-approve" data-date="${log.date}">
                    <i class="fa-solid fa-check"></i> อนุมัติ
                </button>
                <button class="btn btn-danger btn-sm btn-sv-reject" data-date="${log.date}">
                    <i class="fa-solid fa-xmark"></i> แก้ไข
                </button>
            `;
        } else {
            actionButtonsHtml = `
                <button class="btn btn-secondary btn-sm btn-sv-unlock" data-date="${log.date}">
                    <i class="fa-solid fa-lock-open text-warning"></i> ยกเลิก/แก้ไข
                </button>
            `;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="font-semibold">${formatThaiDate(log.date)}</td>
            <td>${log.clockIn || '-'}</td>
            <td>${log.clockOut || '-'}</td>
            <td class="table-hours">${hours > 0 ? hours.toFixed(1) + ' ชม.' : '-'}</td>
            <td>${statusBadgeHtml}</td>
            <td style="white-space: pre-line;">
                ${log.note || '-'}
                ${feedbackTextHtml}
            </td>
            <td class="text-center">
                <div class="table-actions" style="justify-content: center;">
                    ${actionButtonsHtml}
                </div>
            </td>
        `;
        svApprovalTableBody.appendChild(tr);
    });

    svLogCountBadge.textContent = `${recordCount} รายการ`;

    if (recordCount === 0) {
        svApprovalTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-6">
                    <i class="fa-solid fa-inbox text-2xl mb-2 block"></i>
                    ยังไม่มีการลงเวลาปฏิบัติงานของนักศึกษารายนี้
                </td>
            </tr>
        `;
    }

    document.querySelectorAll('.btn-sv-approve').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const date = e.currentTarget.getAttribute('data-date');
            approveLog(date);
        });
    });

    document.querySelectorAll('.btn-sv-reject').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const date = e.currentTarget.getAttribute('data-date');
            openRejectModal(date);
        });
    });

    document.querySelectorAll('.btn-sv-unlock').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const date = e.currentTarget.getAttribute('data-date');
            unlockLog(date);
        });
    });
}

async function approveLog(dateStr) {
    const student = profiles[selectedSvStudentIndex];
    const log = student.logs.find(l => l.date === dateStr);
    if (!log) return;

    showLoadingSpinner(true);
    try {
        const todayStr = getLocalDateString(new Date());
        if (isCloudMode) {
            const res = await fetch('/api/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'approve',
                    studentId: student.id,
                    date: dateStr,
                    approvedBy: supervisorSignature,
                    approvedDate: todayStr
                })
            });
            if (!res.ok) throw new Error("API Approve failed");
        } else {
            log.status = 'approved';
            log.feedback = '';
            log.approvedBy = supervisorSignature;
            log.approvedDate = todayStr;
            saveLocalData();
        }

        // reload logs from cloud
        if (isCloudMode) {
            const logsRes = await fetch(`/api/logs?studentId=${student.id}`);
            if (logsRes.ok) student.logs = await logsRes.json();
        }

        renderSupervisorPanel();
    } catch (err) {
        Swal.fire("ข้อผิดพลาด!", err.message, "error");
    } finally {
        showLoadingSpinner(false);
    }
}

function openRejectModal(dateStr) {
    rejectLogDate.value = dateStr;
    rejectReason.value = '';
    rejectModal.classList.remove('hidden');
}

function hideRejectModal() {
    rejectModal.classList.add('hidden');
}

async function handleRejectSubmit(e) {
    e.preventDefault();
    const dateStr = rejectLogDate.value;
    const feedbackText = rejectReason.value.trim();

    const student = profiles[selectedSvStudentIndex];
    const log = student.logs.find(l => l.date === dateStr);
    
    if (log && feedbackText) {
        showLoadingSpinner(true);
        try {
            if (isCloudMode) {
                const res = await fetch('/api/logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'reject',
                        studentId: student.id,
                        date: dateStr,
                        feedback: feedbackText
                    })
                });
                if (!res.ok) throw new Error("API Reject failed");
            } else {
                log.status = 'rejected';
                log.feedback = feedbackText;
                log.approvedBy = '';
                log.approvedDate = '';
                saveLocalData();
            }

            if (isCloudMode) {
                const logsRes = await fetch(`/api/logs?studentId=${student.id}`);
                if (logsRes.ok) student.logs = await logsRes.json();
            }

            hideRejectModal();
            renderSupervisorPanel();

            Swal.fire({
                title: 'ส่งให้แก้ไขเรียบร้อย!',
                text: 'ระบบได้ระบุข้อความแนะนำให้แก่ตัวนักศึกษาแล้ว',
                icon: 'info',
                confirmButtonColor: 'var(--color-slate-blue)'
            });
        } catch (err) {
            Swal.fire("ข้อผิดพลาด!", err.message, "error");
        } finally {
            showLoadingSpinner(false);
        }
    }
}

async function unlockLog(dateStr) {
    const student = profiles[selectedSvStudentIndex];
    const log = student.logs.find(l => l.date === dateStr);
    if (!log) return;

    const result = await Swal.fire({
        title: 'ยกเลิกการรับรองเวลา?',
        text: `ต้องการปลดล็อกการอนุมัติของวันที่ ${formatThaiDate(dateStr)} หรือไม่? (จะช่วยให้นักศึกษาสามารถแก้ไขรายการนี้ได้อีกครั้ง)`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: 'var(--color-warning)',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'ยืนยันการปลดล็อก',
        cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
        showLoadingSpinner(true);
        try {
            if (isCloudMode) {
                const res = await fetch('/api/logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'unlock',
                        studentId: student.id,
                        date: dateStr
                    })
                });
                if (!res.ok) throw new Error("API Unlock failed");
            } else {
                log.status = 'pending';
                log.approvedBy = '';
                log.approvedDate = '';
                saveLocalData();
            }

            if (isCloudMode) {
                const logsRes = await fetch(`/api/logs?studentId=${student.id}`);
                if (logsRes.ok) student.logs = await logsRes.json();
            }

            renderSupervisorPanel();
        } catch (err) {
            Swal.fire("ข้อผิดพลาด!", err.message, "error");
        } finally {
            showLoadingSpinner(false);
        }
    }
}

async function approveAllLogs() {
    const student = profiles[selectedSvStudentIndex];
    const pendingLogs = student.logs.filter(l => l.status !== 'approved');
    
    if (pendingLogs.length === 0) {
        Swal.fire('ไม่มีรายการคงเหลือ', 'นักศึกษารายนี้ไม่มีวันทำงานที่รออนุมัติเพิ่มเติม', 'info');
        return;
    }

    const result = await Swal.fire({
        title: 'ยืนยันอนุมัติเวลาทำงานทั้งหมด?',
        text: `คุณกำลังจะทำการอนุมัติวันทำงานที่รอคัดกรองทั้งหมดของนักศึกษาท่านนี้ จำนวน ${pendingLogs.length} รายการ`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: 'var(--color-mint)',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'อนุมัติทั้งหมด',
        cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
        showLoadingSpinner(true);
        try {
            const todayStr = getLocalDateString(new Date());
            if (isCloudMode) {
                const res = await fetch('/api/logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'approve_all',
                        studentId: student.id,
                        approvedBy: supervisorSignature,
                        approvedDate: todayStr
                    })
                });
                if (!res.ok) throw new Error("API Approve All failed");
            } else {
                pendingLogs.forEach(log => {
                    log.status = 'approved';
                    log.feedback = '';
                    log.approvedBy = supervisorSignature;
                    log.approvedDate = todayStr;
                });
                saveLocalData();
            }

            if (isCloudMode) {
                const logsRes = await fetch(`/api/logs?studentId=${student.id}`);
                if (logsRes.ok) student.logs = await logsRes.json();
            }

            renderSupervisorPanel();
            Swal.fire('รับรองเวลาทั้งหมดสำเร็จ!', '', 'success');
        } catch (err) {
            Swal.fire("ข้อผิดพลาด!", err.message, "error");
        } finally {
            showLoadingSpinner(false);
        }
    }
}

// --- Register Event Listeners & Modals ---
function registerEventListeners() {
    
    btnRoleStudent.addEventListener('click', () => {
        if (userRole === 'student') return;
        userRole = 'student';
        btnRoleStudent.classList.add('active');
        btnRoleSupervisor.classList.remove('active');
        updateUIVisibility();
    });

    btnRoleSupervisor.addEventListener('click', () => {
        if (userRole === 'supervisor') return;
        
        inputPinCode.value = '';
        pinModal.classList.remove('hidden');
        setTimeout(() => inputPinCode.focus(), 150);
    });

    btnCancelPin.addEventListener('click', () => pinModal.classList.add('hidden'));
    btnCancelPinBack.addEventListener('click', () => pinModal.classList.add('hidden'));

    pinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pinCodeEntered = inputPinCode.value.trim();
        
        showLoadingSpinner(true);
        try {
            let matches = false;
            if (isCloudMode) {
                const res = await fetch('/api/pin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'verify_pin', pin: pinCodeEntered })
                });
                if (res.ok) {
                    const verification = await res.json();
                    matches = verification.success;
                }
            } else {
                matches = (pinCodeEntered === supervisorPin);
            }

            if (matches) {
                pinModal.classList.add('hidden');
                userRole = 'supervisor';
                btnRoleStudent.classList.remove('active');
                btnRoleSupervisor.classList.add('active');
                
                document.querySelectorAll('#supervisorNav li').forEach(el => el.classList.remove('active'));
                document.querySelector('#supervisorNav li[data-section="supervisor-panel"]').classList.add('active');
                
                updateUIVisibility();
                
                Swal.fire({
                    title: 'เข้าสู่โหมดพี่เลี้ยงสำเร็จ!',
                    icon: 'success',
                    timer: 1200,
                    showConfirmButton: false
                });
            } else {
                Swal.fire({
                    title: 'รหัสผ่านผิดพลาด!',
                    text: 'กรุณากรอกรหัส PIN อีกครั้ง (รหัสตั้งต้นคือ 1234)',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
                inputPinCode.value = '';
                inputPinCode.focus();
            }
        } catch (err) {
            Swal.fire("ข้อผิดพลาด!", err.message, "error");
        } finally {
            showLoadingSpinner(false);
        }
    });

    profileSelect.addEventListener('change', (e) => {
        activeProfileIndex = parseInt(e.target.value, 10);
        localStorage.setItem('wfh_active_profile_index', activeProfileIndex);
        updateUIVisibility();
    });

    svStudentSelect.addEventListener('change', (e) => {
        selectedSvStudentIndex = parseInt(e.target.value, 10);
        renderSupervisorPanel();
    });

    btnApproveAll.addEventListener('click', approveAllLogs);

    btnCancelReject.addEventListener('click', hideRejectModal);
    btnCancelRejectBack.addEventListener('click', hideRejectModal);
    rejectForm.addEventListener('submit', handleRejectSubmit);

    // Change Password PIN
    changePinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const oldPinVal = currentPin.value;
        const newPinVal = newPin.value;
        const confirmPinVal = confirmNewPin.value;

        if (newPinVal !== confirmPinVal) {
            Swal.fire('รหัสผ่านไม่ตรงกัน!', 'กรุณากรอกรหัสผ่านใหม่และยืนยันให้ตรงกัน', 'error');
            return;
        }

        showLoadingSpinner(true);
        try {
            if (isCloudMode) {
                const res = await fetch('/api/pin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'change_pin',
                        oldPin: oldPinVal,
                        newPin: newPinVal
                    })
                });
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || "เปลี่ยนรหัสผ่านล้มเหลว");
                }
            } else {
                if (oldPinVal !== supervisorPin) {
                    throw new Error("รหัสเดิมไม่ถูกต้อง!");
                }
                supervisorPin = newPinVal;
                localStorage.setItem('wfh_supervisor_pin', supervisorPin);
            }

            changePinForm.reset();
            Swal.fire('เปลี่ยนรหัส PIN สำเร็จ!', 'รหัสเข้าโหมดพี่เลี้ยงได้รับการแก้ไขแล้ว', 'success');
        } catch (err) {
            Swal.fire("เกิดข้อผิดพลาด!", err.message, "error");
        } finally {
            showLoadingSpinner(false);
        }
    });

    // Save Digital signature config
    signatureForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameVal = svNameDisplay.value.trim();
        const sigVal = svSignatureText.value.trim();

        showLoadingSpinner(true);
        try {
            if (isCloudMode) {
                const res = await fetch('/api/pin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'update_signature',
                        name: nameVal,
                        signature: sigVal
                    })
                });
                if (!res.ok) throw new Error("API update signature failed");
            } else {
                localStorage.setItem('wfh_supervisor_name', nameVal);
                localStorage.setItem('wfh_supervisor_sig', sigVal);
            }

            supervisorName = nameVal;
            supervisorSignature = sigVal;
            Swal.fire('บันทึกข้อมูลสำเร็จ!', 'ลายเซ็นและข้อมูลการรับรองอัปเดตเรียบร้อย', 'success');
        } catch (err) {
            Swal.fire("เกิดข้อผิดพลาด!", err.message, "error");
        } finally {
            showLoadingSpinner(false);
        }
    });

    btnNewProfile.addEventListener('click', () => showProfileModal());
    btnPromptCreate.addEventListener('click', () => showProfileModal());
    
    btnEditProfile.addEventListener('click', () => {
        if (activeProfileIndex >= 0) {
            showProfileModal(activeProfileIndex);
        }
    });

    btnCloseModal.addEventListener('click', hideProfileModal);
    btnCancelModal.addEventListener('click', hideProfileModal);
    profileForm.addEventListener('submit', handleProfileSubmit);

    // Delete Student Profile Action
    btnDeleteProfile.addEventListener('click', async () => {
        const editIndex = parseInt(editProfileIndex.value, 10);
        if (editIndex < 0) return;

        const profileToDelete = profiles[editIndex];

        const result = await Swal.fire({
            title: 'ต้องการลบโปรไฟล์นี้?',
            text: `ยืนยันการลบโปรไฟล์ของ "${profileToDelete.name}" หรือไม่? ข้อมูลประวัติการลงเวลาทำงานทั้งหมดของนักศึกษารายนี้จะถูกลบอย่างถาวรและไม่สามารถกู้คืนได้!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'ยืนยันลบโปรไฟล์',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            showLoadingSpinner(true);
            try {
                if (isCloudMode) {
                    const res = await fetch(`/api/profiles?id=${profileToDelete.id}`, {
                        method: 'DELETE'
                    });
                    if (!res.ok) {
                        const errData = await res.json();
                        throw new Error(errData.error || "Failed to delete profile from Cloud");
                    }
                } else {
                    profiles = profiles.filter((_, idx) => idx !== editIndex);
                    saveLocalData();
                }

                // Adjust active index
                if (activeProfileIndex === editIndex) {
                    activeProfileIndex = profiles.length > 0 ? 0 : -1;
                    localStorage.setItem('wfh_active_profile_index', activeProfileIndex);
                } else if (activeProfileIndex > editIndex) {
                    activeProfileIndex--;
                    localStorage.setItem('wfh_active_profile_index', activeProfileIndex);
                }

                hideProfileModal();
                await loadDataRouter();

                Swal.fire('ลบโปรไฟล์สำเร็จ!', '', 'success');
            } catch (err) {
                Swal.fire('เกิดข้อผิดพลาด!', err.message, 'error');
            } finally {
                showLoadingSpinner(false);
            }
        }
    });

    // Sidebar Section Navigations
    document.querySelectorAll('.sidebar-nav li').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            const currentNavParentId = item.closest('nav').id;
            document.querySelectorAll(`#${currentNavParentId} li`).forEach(el => el.classList.remove('active'));
            
            const targetSection = item.getAttribute('data-section');
            item.classList.add('active');
            
            document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
            document.getElementById(targetSection).classList.add('active');
            
            const linkText = item.querySelector('a').textContent.trim();
            pageTitle.textContent = linkText;
        });
    });

    // Clock Actions (Clock-In)
    btnClockIn.addEventListener('click', async () => {
        if (activeProfileIndex < 0) return;
        
        const now = new Date();
        const todayStr = getLocalDateString(now);
        const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        
        const student = profiles[activeProfileIndex];
        
        showLoadingSpinner(true);
        try {
            if (isCloudMode) {
                const res = await fetch('/api/logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'clock_in',
                        studentId: student.id,
                        date: todayStr,
                        clockIn: timeStr,
                        note: clockNote.value.trim()
                    })
                });
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || "Clock-in failed");
                }
            } else {
                const logs = student.logs;
                if (logs.some(l => l.date === todayStr)) {
                    throw new Error("วันนี้มีการลงเวลาปฏิบัติงานเรียบร้อยแล้ว");
                }

                const newLog = {
                    date: todayStr,
                    clockIn: timeStr,
                    clockOut: '',
                    note: clockNote.value.trim(),
                    status: 'pending',
                    feedback: '',
                    approvedBy: '',
                    approvedDate: ''
                };
                student.logs.push(newLog);
                saveLocalData();
            }

            await refreshLogs();
            updateUIVisibility();
            
            Swal.fire({
                title: 'ลงเวลาเข้างานสำเร็จ!',
                text: `วันที่ ${formatThaiDate(todayStr)} เวลา ${timeStr} น.`,
                icon: 'success',
                confirmButtonColor: 'var(--color-mint)'
            });
        } catch (err) {
            Swal.fire("ล้มเหลว!", err.message, "error");
        } finally {
            showLoadingSpinner(false);
        }
    });

    // Clock-Out
    btnClockOut.addEventListener('click', async () => {
        if (activeProfileIndex < 0) return;
        
        const now = new Date();
        const todayStr = getLocalDateString(now);
        const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        
        const student = profiles[activeProfileIndex];
        
        showLoadingSpinner(true);
        try {
            if (isCloudMode) {
                const res = await fetch('/api/logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'clock_out',
                        studentId: student.id,
                        date: todayStr,
                        clockOut: timeStr,
                        note: clockNote.value.trim()
                    })
                });
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || "Clock-out failed");
                }
            } else {
                const logs = student.logs;
                const todayLog = logs.find(log => log.date === todayStr);
                if (todayLog) {
                    todayLog.clockOut = timeStr;
                    todayLog.note = clockNote.value.trim();
                    todayLog.status = 'pending';
                    todayLog.feedback = '';
                    saveLocalData();
                }
            }

            await refreshLogs();
            updateUIVisibility();
            
            Swal.fire({
                title: 'ลงเวลาออกงานสำเร็จ!',
                text: `วันที่ ${formatThaiDate(todayStr)} เวลา ${timeStr} น.`,
                icon: 'success',
                confirmButtonColor: 'var(--color-slate-blue)'
            });
        } catch (err) {
            Swal.fire("ล้มเหลว!", err.message, "error");
        } finally {
            showLoadingSpinner(false);
        }
    });

    // Manual Time Log Form Submission
    manualEntryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (activeProfileIndex < 0) return;

        const dateVal = entryDate.value;
        const inTimeVal = entryInTime.value;
        const outTimeVal = entryOutTime.value;
        const noteVal = entryNote.value.trim();

        if (inTimeVal >= outTimeVal) {
            Swal.fire({
                title: 'กรอกเวลาผิดพลาด!',
                text: 'เวลาออกงานต้องอยู่หลังเวลาเข้างาน',
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
            return;
        }

        const student = profiles[activeProfileIndex];

        showLoadingSpinner(true);
        try {
            if (isCloudMode) {
                const res = await fetch('/api/logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'manual_save',
                        studentId: student.id,
                        date: dateVal,
                        clockIn: inTimeVal,
                        clockOut: outTimeVal,
                        note: noteVal
                    })
                });
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || "Manual save failed");
                }
            } else {
                const logs = student.logs;
                const existingIndex = logs.findIndex(log => log.date === dateVal);
                if (existingIndex >= 0 && logs[existingIndex].status === 'approved') {
                    throw new Error("รายการนี้ถูกอนุมัติแล้ว ไม่สามารถแก้ไขได้");
                }

                const logEntry = {
                    date: dateVal,
                    clockIn: inTimeVal,
                    clockOut: outTimeVal,
                    note: noteVal,
                    status: 'pending',
                    feedback: '',
                    approvedBy: '',
                    approvedDate: ''
                };

                if (existingIndex >= 0) {
                    logs[existingIndex] = logEntry;
                } else {
                    logs.push(logEntry);
                    logs.sort((a, b) => new Date(a.date) - new Date(b.date));
                }
                saveLocalData();
            }

            await refreshLogs();
            manualEntryForm.reset();
            entryDate.value = getLocalDateString(new Date());
            
            updateUIVisibility();
            Swal.fire('บันทึกเวลสำเร็จ!', `บันทึกข้อมูลเวลาการทำงานเรียบร้อย`, 'success');
        } catch (err) {
            Swal.fire("ล้มเหลว!", err.message, "error");
        } finally {
            showLoadingSpinner(false);
        }
    });

    btnPrevMonth.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });

    btnNextMonth.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });

    filterMonth.addEventListener('change', renderHistoryTable);
    searchTask.addEventListener('input', renderHistoryTable);

    // Backup
    btnBackup.addEventListener('click', () => {
        const backupPayload = {
            profiles: profiles,
            pin: supervisorPin,
            supervisorName: supervisorName,
            supervisorSignature: supervisorSignature
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `wfh_student_logs_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    // Restore
    btnRestore.addEventListener('click', () => {
        fileRestore.click();
    });

    fileRestore.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(evt) {
            showLoadingSpinner(true);
            try {
                const parsed = JSON.parse(evt.target.result);
                let loadedProfiles = [];
                let loadedPin = "1234";
                let loadedSvName = "นายสมศักดิ์ รักมั่น (พี่เลี้ยง)";
                let loadedSvSig = "สมศักดิ์ ร.";

                if (Array.isArray(parsed)) {
                    loadedProfiles = parsed;
                } else if (parsed.hasOwnProperty('profiles')) {
                    loadedProfiles = parsed.profiles;
                    if (parsed.pin) loadedPin = parsed.pin;
                    if (parsed.supervisorName) loadedSvName = parsed.supervisorName;
                    if (parsed.supervisorSignature) loadedSvSig = parsed.supervisorSignature;
                }

                if (Array.isArray(loadedProfiles) && loadedProfiles.length > 0 && loadedProfiles[0].hasOwnProperty('id') && loadedProfiles[0].hasOwnProperty('name')) {
                    
                    if (isCloudMode) {
                        // Restore into Cloud D1
                        // 1. Restore/Upsert settings
                        await fetch('/api/pin', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'change_pin', oldPin: supervisorPin, newPin: loadedPin })
                        });
                        await fetch('/api/pin', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'update_signature', name: loadedSvName, signature: loadedSvSig })
                        });

                        // 2. Restore profiles and logs
                        for (let profile of loadedProfiles) {
                            // Create/Update profile
                            await fetch('/api/profiles', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    id: profile.id,
                                    name: profile.name,
                                    dept: profile.dept,
                                    advisor: profile.advisor,
                                    company: profile.company,
                                    action: "edit" // updates if exists, or handle creation
                                })
                            });

                            // Restore logs
                            for (let log of profile.logs) {
                                await fetch('/api/logs', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        action: 'manual_save',
                                        studentId: profile.id,
                                        date: log.date,
                                        clockIn: log.clockIn,
                                        clockOut: log.clockOut,
                                        note: log.note
                                    })
                                });

                                // Restore approval status if it was approved
                                if (log.status === 'approved') {
                                    await fetch('/api/logs', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            action: 'approve',
                                            studentId: profile.id,
                                            date: log.date,
                                            approvedBy: log.approvedBy || loadedSvSig,
                                            approvedDate: log.approvedDate || getLocalDateString(new Date())
                                        })
                                    });
                                } else if (log.status === 'rejected') {
                                    await fetch('/api/logs', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            action: 'reject',
                                            studentId: profile.id,
                                            date: log.date,
                                            feedback: log.feedback
                                        })
                                    });
                                }
                            }
                        }
                    } else {
                        // Local storage restore
                        profiles = loadedProfiles;
                        supervisorPin = loadedPin;
                        supervisorName = loadedSvName;
                        supervisorSignature = loadedSvSig;
                        localStorage.setItem('wfh_supervisor_pin', supervisorPin);
                        localStorage.setItem('wfh_supervisor_name', supervisorName);
                        localStorage.setItem('wfh_supervisor_sig', supervisorSignature);
                        saveLocalData();
                    }

                    // Reload everything
                    await loadDataRouter();
                    Swal.fire('กู้คืนข้อมูลสำเร็จ!', `กู้คืนข้อมูลนักศึกษาทั้งหมดแล้ว`, 'success');
                } else {
                    Swal.fire('ไฟล์ข้อมูลไม่ถูกต้อง!', 'โครงสร้างไฟล์ JSON ไม่ตรงตามกำหนด', 'error');
                }
            } catch (err) {
                Swal.fire('เกิดข้อผิดพลาด!', err.message, 'error');
            } finally {
                showLoadingSpinner(false);
            }
        };
        reader.readAsText(file);
        fileRestore.value = '';
    });

    btnExportCSV.addEventListener('click', () => {
        if (activeProfileIndex < 0) return;
        exportToCSVFile();
    });

    btnPrintReport.addEventListener('click', () => {
        if (activeProfileIndex < 0) return;
        
        const activeProfile = profiles[activeProfileIndex];
        const pendingCount = activeProfile.logs.filter(l => l.status !== 'approved').length;
        
        if (pendingCount > 0) {
            Swal.fire({
                title: 'มีรายการยังไม่ได้รับการอนุมัติ!',
                text: `คุณมีบันทึกเวลาที่ยังรอพี่เลี้ยงลงนามตรวจรับรองอีก ${pendingCount} รายการ ต้องการพิมพ์ต่อเลยหรือไม่?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: 'var(--color-slate-blue)',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'ยืนยันเพื่อพิมพ์ต่อ',
                cancelButtonText: 'ยกเลิกกลับไปตรวจสอบ'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.print();
                }
            });
        } else {
            window.print();
        }
    });
}

// --- Student Profile Modal Control ---
function showProfileModal(index = -1) {
    profileForm.reset();
    
    if (index >= 0) {
        modalTitle.textContent = "แก้ไขโปรไฟล์นักศึกษา";
        editProfileIndex.value = index;
        
        const profile = profiles[index];
        studentId.value = profile.id;
        document.getElementById('oldStudentId').value = profile.id;
        studentName.value = profile.name;
        studentDept.value = profile.dept || '';
        studentAdvisor.value = profile.advisor || '';
        studentCompany.value = profile.company || '';
        studentId.disabled = false; // อนุญาตให้แก้ไขรหัสนักศึกษาได้
        btnDeleteProfile.classList.remove('hidden');
    } else {
        modalTitle.textContent = "เพิ่มโปรไฟล์นักศึกษาใหม่";
        editProfileIndex.value = -1;
        document.getElementById('oldStudentId').value = "";
        studentId.disabled = false;
        btnDeleteProfile.classList.add('hidden');
    }
    
    profileModal.classList.remove('hidden');
}

function hideProfileModal() {
    profileModal.classList.add('hidden');
}

async function handleProfileSubmit(e) {
    e.preventDefault();
    
    const idVal = studentId.value.trim();
    const oldIdVal = document.getElementById('oldStudentId').value.trim();
    const nameVal = studentName.value.trim();
    const deptVal = studentDept.value.trim();
    const advisorVal = studentAdvisor.value.trim();
    const companyVal = studentCompany.value.trim();
    const editIndex = parseInt(editProfileIndex.value, 10);

    showLoadingSpinner(true);
    try {
        if (isCloudMode) {
            const payload = {
                id: idVal,
                oldId: oldIdVal,
                name: nameVal,
                dept: deptVal,
                advisor: advisorVal,
                company: companyVal,
                action: editIndex >= 0 ? "edit" : "create"
            };

            const res = await fetch('/api/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "API profile action failed");
            }
        } else {
            if (editIndex >= 0) {
                const oldProfile = profiles[editIndex];
                
                // ถ้ารหัสเปลี่ยนในโหมดออฟไลน์
                if (idVal !== oldIdVal) {
                    const isDuplicate = profiles.some((p, i) => p.id === idVal && i !== editIndex);
                    if (isDuplicate) throw new Error("รหัสนักศึกษาใหม่นี้มีอยู่ในระบบแล้ว");
                    
                    oldProfile.logs.forEach(log => {
                        log.student_id = idVal;
                    });
                }
                
                oldProfile.id = idVal;
                oldProfile.name = nameVal;
                oldProfile.dept = deptVal;
                oldProfile.advisor = advisorVal;
                oldProfile.company = companyVal;
            } else {
                const isDuplicate = profiles.some(p => p.id === idVal);
                if (isDuplicate) throw new Error("รหัสนักศึกษาซ้ำ!");

                const newProfile = {
                    id: idVal,
                    name: nameVal,
                    dept: deptVal,
                    advisor: advisorVal,
                    company: companyVal,
                    logs: []
                };
                profiles.push(newProfile);
                activeProfileIndex = profiles.length - 1;
            }
            saveLocalData();
        }

        // reload profiles and refresh state
        await loadDataRouter();
        hideProfileModal();

        Swal.fire('บันทึกโปรไฟล์สำเร็จ!', '', 'success');
    } catch (err) {
        Swal.fire("ข้อผิดพลาด!", err.message, "error");
    } finally {
        showLoadingSpinner(false);
    }
}

// --- Export CSV Generator ---
function exportToCSVFile() {
    const activeProfile = profiles[activeProfileIndex];
    const logs = [...activeProfile.logs].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let csvContent = "\uFEFF"; // BOM
    csvContent += `รายงานการปฏิบัติงานสหกิจศึกษา (Work From Home) - ใบลงเวลาการรับรองเวลา\n`;
    csvContent += `ชื่อ-นามสกุล,${activeProfile.name},รหัสนักศึกษา,${activeProfile.id}\n`;
    csvContent += `สาขาวิชา,${activeProfile.dept || '-'},สถานประกอบการ,${activeProfile.company || '-'}\n`;
    csvContent += `อาจารย์ที่ปรึกษา/พี่เลี้ยง,${activeProfile.advisor || '-'}\n\n`;
    
    csvContent += "ลำดับ,วันที่,เวลาเข้าปฏิบัติงาน,เวลาออกปฏิบัติงาน,ชั่วโมงทำงานสุทธิ,สถานะการรับรอง,ผู้อนุมัติรับรอง,ภาระงาน / รายละเอียดงานที่ปฏิบัติโดยสังเขป\n";
    
    let index = 1;
    logs.forEach(log => {
        const hours = calculateHours(log.clockIn, log.clockOut);
        
        let statusStr = "รอการตรวจสอบ";
        if (log.status === 'approved') statusStr = "อนุมัติแล้ว";
        else if (log.status === 'rejected') statusStr = "ให้กลับแก้ไข";

        let cleanNote = log.note || '';
        if (cleanNote.includes(',') || cleanNote.includes('"') || cleanNote.includes('\n')) {
            cleanNote = `"${cleanNote.replace(/"/g, '""')}"`;
        }
        
        csvContent += `${index++},${log.date},${log.clockIn || '-'},${log.clockOut || '-'},${hours > 0 ? hours.toFixed(1) : '0.0'},${statusStr},${log.approvedBy || '-'},${cleanNote}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const cleanedName = activeProfile.name.replace(/\s+/g, '_');
    link.setAttribute("download", `wfh_report_${activeProfile.id}_${cleanedName}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
