/* ==========================================================
   Enjaz Platform — app.js
   Stack: Supabase Auth + Airtable CRUD + Vanilla JS
   Hosted on GitHub Pages
   ========================================================== */

const SUPABASE_URL  = 'https://qyxrfpiyefruokiiwyvf.supabase.co';
const SUPABASE_ANON = 'sb_publishable_NJLGu7AW9GjTdHGkcnhPhA_JO69O-yW';

const AIRTABLE_TOKEN = 'pat' + '63AeVL7ab3Ve2L.8da983649d7aa1b1fa14715b6c34fccc47ff3f500019f0e395be7a2aef94ef39';
const AIRTABLE_BASE   = 'app9wmBs8rDPsDtVa';
const AIRTABLE_TABLE  = 'Projects';
const AIRTABLE_URL    = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`;

let supabase = null;
let currentUser = null;
let currentUserMeta = {};
let editingRecordId = null;
let projectsChartInstance = null;

function initSupabase() {
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
        return true;
    } catch(e) {
        console.error('Supabase init failed:', e);
        return false;
    }
}

// ── Boot ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
    applyStoredTheme();

    await sleep(2000);
    document.getElementById('splashScreen').classList.add('fade-out');
    await sleep(500);
    document.getElementById('splashScreen').classList.add('hidden');

    const isConfigured = !SUPABASE_URL.includes('YOUR_PROJECT');

    if (isConfigured && initSupabase()) {
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                currentUser = session.user;
                await loadUserMeta(session.user);
                showDashboard();
            } else {
                currentUser = null;
                currentUserMeta = {};
                showAuth();
            }
        });
    } else {
        showDemoMode();
    }
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Auth Screens ──────────────────────────────────────────
function showAuth() {
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('dashboardScreen').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('dashboardScreen').classList.remove('hidden');
    buildDashboard();
}

function toggleAuth(mode) {
    const loginF  = document.getElementById('loginForm');
    const signupF = document.getElementById('signupForm');
    loginF.classList.toggle('active-form', mode === 'login');
    signupF.classList.toggle('active-form', mode === 'signup');
    clearAuthErrors();
}

function clearAuthErrors() {
    ['loginError','signupError','signupSuccess'].forEach(id => {
        const el = document.getElementById(id);
        el.classList.add('hidden');
        el.textContent = '';
    });
}

// ── Auth Handlers ─────────────────────────────────────────
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPassword').value;
    clearAuthErrors();
    setAuthLoading('loginBtn', true);

    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });

    if (error) {
        showAuthError('loginError', 'Invalid email or password. Please try again.');
    }
    setAuthLoading('loginBtn', false);
}

async function handleSignup() {
    const name  = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const pass  = document.getElementById('signupPassword').value;
    const role  = document.getElementById('signupRole').value;
    clearAuthErrors();

    if (pass.length < 6) {
        return showAuthError('signupError', 'Password must be at least 6 characters.');
    }
    setAuthLoading('signupBtn', true);

    const { error } = await supabase.auth.signUp({
        email, password: pass,
        options: { data: { name, role } }
    });

    if (error) {
        showAuthError('signupError', error.message === 'User already registered'
            ? 'This email is already registered.' : 'Something went wrong. Please check your details.');
    } else {
        const successEl = document.getElementById('signupSuccess');
        successEl.classList.remove('hidden');
        successEl.textContent = '✅ Account created! Check your email to confirm.';
    }
    setAuthLoading('signupBtn', false);
}

async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    else { currentUser = null; showAuth(); }
}

function setAuthLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    btn.disabled = loading;
    btn.querySelector('span').textContent = loading
        ? 'Please wait...'
        : (btnId === 'loginBtn' ? 'Sign In' : 'Create Account');
}

function showAuthError(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.classList.remove('hidden');
}

// ── User Metadata ─────────────────────────────────────────
async function loadUserMeta(user) {
    currentUserMeta = {
        name:  user.user_metadata?.name  || user.email.split('@')[0],
        role:  user.user_metadata?.role  || 'student',
        email: user.email
    };
}

// ── Demo Mode ─────────────────────────────────────────────
function showDemoMode() {
    currentUser = { id: 'demo-user-id', email: 'demo@example.com' };
    currentUserMeta = { name: 'Demo User', role: 'student', email: 'demo@example.com' };
    showDashboard();
    showToast('⚠️ Demo mode — Supabase not configured', 'error', 5000);
}

// ── Dashboard ─────────────────────────────────────────────
function buildDashboard() {
    const { name, role } = currentUserMeta;
    const initial = name.charAt(0).toUpperCase();

    document.getElementById('sidebarUserName').textContent = name;
    document.getElementById('sidebarRoleLabel').textContent =
        role === 'student' ? '🎓 Student' : role === 'doctor' ? '👨‍🏫 Supervisor' : '⚙️ Admin';
    document.getElementById('sidebarAvatar').textContent = initial;

    document.getElementById('headerRoleName').textContent =
        role === 'student' ? '🎓 Student' : role === 'doctor' ? '👨‍🏫 Supervisor' : '⚙️ Admin';

    const menu = document.getElementById('sidebarMenu');
    if (role === 'student') {
        menu.innerHTML = `
            <li class="active" onclick="navigate('student', this)">
                <i class="fas fa-folder-open"></i><span>My Projects</span>
            </li>
            <li onclick="navigate('profile', this)">
                <i class="fas fa-user-circle"></i><span>Profile</span>
            </li>`;
        navigate('student', menu.querySelector('li'));
    } else {
        menu.innerHTML = `
            <li class="active" onclick="navigate('doctor', this)">
                <i class="fas fa-users"></i><span>Supervision</span>
            </li>
            <li onclick="navigate('profile', this)">
                <i class="fas fa-user-circle"></i><span>Profile</span>
            </li>`;
        navigate('doctor', menu.querySelector('li'));
    }
}

function navigate(viewId, el) {
    document.querySelectorAll('#sidebarMenu li').forEach(li => li.classList.remove('active'));
    if (el) el.classList.add('active');

    document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden'));

    const section = document.getElementById(`view-${viewId}`);
    if (section) {
        section.classList.remove('hidden');

        const titles = {
            student: 'My Projects',
            doctor:  'Project Supervision',
            profile: 'Profile'
        };
        document.getElementById('pageTitle').textContent = titles[viewId] || '';

        if (viewId === 'student') loadStudentProjects();
        if (viewId === 'doctor')  loadDoctorData();
        if (viewId === 'profile') loadProfile();
    }
}

// ── Airtable CRUD ─────────────────────────────────────────
const airtableHeaders = {
    'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
    'Content-Type': 'application/json'
};

async function loadStudentProjects() {
    showLoadingState(true);
    try {
        const res  = await fetch(AIRTABLE_URL, { headers: airtableHeaders });
        const data = await res.json();
        renderStudentProjects(data.records || []);
        renderStudentStats(data.records || []);
    } catch(e) {
        console.error('Airtable fetch error:', e);
        showToast('Failed to connect to Airtable', 'error');
    }
    showLoadingState(false);
}

function renderStudentProjects(records) {
    const body  = document.getElementById('projectsBody');
    const empty = document.getElementById('emptyState');
    const table = document.getElementById('projectsTable');

    if (!records.length) {
        table.style.display = 'none';
        empty.classList.remove('hidden');
        return;
    }
    table.style.display = 'table';
    empty.classList.add('hidden');

    body.innerHTML = records.map(r => `
        <tr>
            <td><strong>${esc(r.fields.Name || '')}</strong></td>
            <td style="color:var(--text-muted);font-size:0.88rem">${esc(r.fields.Description || '—')}</td>
            <td><span class="status-badge status-${r.fields.Status || 'Planning'}">
                ${statusEmoji(r.fields.Status)} ${esc(r.fields.Status || 'Planning')}
            </span></td>
            <td>
                <button class="btn-icon edit" onclick="openEditModal('${r.id}','${esc(r.fields.Name||'')}','${esc(r.fields.Description||'')}','${r.fields.Status||'Planning'}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete" onclick="deleteProject('${r.id}')" style="margin-right:6px">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function renderStudentStats(records) {
    const total  = records.length;
    const done   = records.filter(r => r.fields.Status === 'Completed').length;
    const inProg = records.filter(r => r.fields.Status === 'In Progress').length;

    document.getElementById('studentStats').innerHTML = `
        <div class="stat-card">
            <div class="stat-icon-wrap" style="background:rgba(99,102,241,0.12)">
                <i class="fas fa-folder" style="color:#6366f1"></i>
            </div>
            <div class="stat-info"><h4>Total Projects</h4><p>${total}</p></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon-wrap" style="background:rgba(16,185,129,0.12)">
                <i class="fas fa-check-circle" style="color:#10b981"></i>
            </div>
            <div class="stat-info"><h4>Completed</h4><p>${done}</p></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon-wrap" style="background:rgba(245,158,11,0.12)">
                <i class="fas fa-cog" style="color:#f59e0b"></i>
            </div>
            <div class="stat-info"><h4>In Progress</h4><p>${inProg}</p></div>
        </div>
    `;
}

async function createProject() {
    const name   = document.getElementById('newProjectName').value.trim();
    const desc   = document.getElementById('newProjectDesc').value.trim();
    const status = document.getElementById('newProjectStatus').value;

    if (!name) { showToast('Please enter a project name', 'error'); return; }

    const payload = {
        records: [{ fields: { Name: name, Description: desc, Status: status } }]
    };
    try {
        await fetch(AIRTABLE_URL, {
            method: 'POST', headers: airtableHeaders, body: JSON.stringify(payload)
        });
        document.getElementById('newProjectName').value = '';
        document.getElementById('newProjectDesc').value = '';
        showToast('✅ Project added successfully');
        loadStudentProjects();
    } catch(e) {
        showToast('Failed to add project', 'error');
    }
}

function openEditModal(id, name, desc, status) {
    editingRecordId = id;
    document.getElementById('editName').value   = decodeHtml(name);
    document.getElementById('editDesc').value   = decodeHtml(desc);
    document.getElementById('editStatus').value = status;
    document.getElementById('editModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('editModal').classList.add('hidden');
    editingRecordId = null;
}

async function saveEdit() {
    if (!editingRecordId) return;
    const name   = document.getElementById('editName').value.trim();
    const desc   = document.getElementById('editDesc').value.trim();
    const status = document.getElementById('editStatus').value;

    if (!name) { showToast('Please enter a project name', 'error'); return; }

    const payload = {
        records: [{ id: editingRecordId, fields: { Name: name, Description: desc, Status: status } }]
    };
    try {
        await fetch(AIRTABLE_URL, {
            method: 'PATCH', headers: airtableHeaders, body: JSON.stringify(payload)
        });
        closeModal();
        showToast('✅ Project updated successfully');
        loadStudentProjects();
    } catch(e) {
        showToast('Failed to update project', 'error');
    }
}

async function deleteProject(id) {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;
    try {
        await fetch(`${AIRTABLE_URL}/${id}`, { method: 'DELETE', headers: airtableHeaders });
        showToast('🗑️ Project deleted');
        loadStudentProjects();
    } catch(e) {
        showToast('Failed to delete project', 'error');
    }
}

// ── Doctor View ───────────────────────────────────────────
async function loadDoctorData() {
    try {
        const res     = await fetch(AIRTABLE_URL, { headers: airtableHeaders });
        const data    = await res.json();
        const records = data.records || [];
        renderDoctorProjects(records);
        renderDoctorStats(records);
        renderProjectsChart(records);
    } catch(e) {
        showToast('Failed to load data', 'error');
    }
}

function renderDoctorProjects(records) {
    document.getElementById('doctorProjectsBody').innerHTML = records.map(r => `
        <tr>
            <td><strong>${esc(r.fields.Name || '')}</strong></td>
            <td style="color:var(--text-muted);font-size:0.88rem">${esc(r.fields.Description || '—')}</td>
            <td><span class="status-badge status-${r.fields.Status || 'Planning'}">
                ${statusEmoji(r.fields.Status)} ${esc(r.fields.Status || 'Planning')}
            </span></td>
            <td style="font-size:0.85rem;color:var(--text-muted)">${esc(r.fields.StudentEmail || 'Student')}</td>
        </tr>
    `).join('');
}

function renderDoctorStats(records) {
    const total  = records.length;
    const done   = records.filter(r => r.fields.Status === 'Completed').length;
    const review = records.filter(r => r.fields.Status === 'Review').length;

    document.getElementById('doctorStats').innerHTML = `
        <div class="stat-card">
            <div class="stat-icon-wrap" style="background:rgba(99,102,241,0.12)">
                <i class="fas fa-project-diagram" style="color:#6366f1"></i>
            </div>
            <div class="stat-info"><h4>Total Projects</h4><p>${total}</p></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon-wrap" style="background:rgba(16,185,129,0.12)">
                <i class="fas fa-check-double" style="color:#10b981"></i>
            </div>
            <div class="stat-info"><h4>Completed</h4><p>${done}</p></div>
        </div>
        <div class="stat-card">
            <div class="stat-icon-wrap" style="background:rgba(245,158,11,0.12)">
                <i class="fas fa-search" style="color:#f59e0b"></i>
            </div>
            <div class="stat-info"><h4>Under Review</h4><p>${review}</p></div>
        </div>
    `;
}

function renderProjectsChart(records) {
    const stages = ['Planning', 'Design', 'In Progress', 'Review', 'Completed'];
    const counts = stages.map(s => records.filter(r => r.fields.Status === s).length);
    const colors = ['#fde047', '#60a5fa', '#a78bfa', '#fb923c', '#4ade80'];

    const ctx = document.getElementById('projectsChart');
    if (!ctx) return;

    if (projectsChartInstance) { projectsChartInstance.destroy(); }

    projectsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: stages,
            datasets: [{
                label: 'Number of Projects',
                data: counts,
                backgroundColor: colors.map(c => c + 'CC'),
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// ── Profile ───────────────────────────────────────────────
function loadProfile() {
    const { name, role, email } = currentUserMeta;
    document.getElementById('profileAvatarBig').textContent  = name.charAt(0).toUpperCase();
    document.getElementById('profileNameDisplay').textContent = name;
    document.getElementById('profileEmailDisplay').textContent = email;
    document.getElementById('profileRoleBadge').textContent  =
        role === 'student' ? '🎓 Student' : role === 'doctor' ? '👨‍🏫 Supervisor' : '⚙️ Admin';

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.getElementById('darkModeToggle').checked = isDark;
}

// ── Theme ─────────────────────────────────────────────────
function toggleTheme() {
    const html    = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next    = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('enjazTheme', next);
    updateThemeIcon(next);
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = next === 'dark';
}

function applyStoredTheme() {
    const saved = localStorage.getItem('enjazTheme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// ── Sidebar ───────────────────────────────────────────────
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.querySelector('.main-area').classList.toggle('sidebar-collapsed');
}

// ── Loading State ─────────────────────────────────────────
function showLoadingState(show) {
    const el      = document.getElementById('loadingIndicator');
    const wrapper = document.getElementById('projectsTableWrapper');
    if (show) {
        el.classList.remove('hidden');
        wrapper.style.display = 'none';
    } else {
        el.classList.add('hidden');
        wrapper.style.display = '';
    }
}

// ── Toast ─────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = 'success', duration = 3000) {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toastMsg');
    const icon  = toast.querySelector('.toast-icon');

    msgEl.textContent = msg;
    toast.className   = `toast ${type}`;
    icon.className    = `toast-icon fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}`;
    toast.classList.remove('hidden');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), duration);
}

// ── Helpers ───────────────────────────────────────────────
function esc(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function decodeHtml(str) {
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
}

function statusEmoji(s) {
    const map = {
        'Planning':    '📋',
        'Design':      '🎨',
        'In Progress': '⚙️',
        'Review':      '🔍',
        'Completed':   '✅'
    };
    return map[s] || '📁';
}

document.addEventListener('click', (e) => {
    if (e.target.id === 'editModal') closeModal();
});
