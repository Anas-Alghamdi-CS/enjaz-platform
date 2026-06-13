/* ============================================================
   Enjaz Platform — app.js
   Stack: Supabase Auth + Supabase DB
   Roles: student / doctor / admin
   ============================================================ */

const SUPABASE_URL  = 'https://qyxrfpiyefruokiiwyvf.supabase.co';
const SUPABASE_ANON = 'sb_publishable_NJLGu7AW9GjTdHGkcnhPhA_JO69O-yW';

let _supabase             = null;
let currentUser           = null;
let currentUserMeta       = {};
let activeProjectId       = null;
let platformChartInstance = null;

function initSupabase() {
    try {
        _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
        return true;
    } catch (e) {
        console.error('Supabase init failed:', e);
        return false;
    }
}

/* ── Boot ───────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', async () => {
    applyStoredTheme();
    await sleep(2000);
    document.getElementById('splashScreen').classList.add('fade-out');
    await sleep(500);
    document.getElementById('splashScreen').classList.add('hidden');

    if (initSupabase()) {
        _supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                currentUser = session.user;
                await loadUserMeta(session.user);
                showDashboard();
            } else {
                currentUser     = null;
                currentUserMeta = {};
                showAuth();
            }
        });
    }
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ── Auth Screens ───────────────────────────────────────── */
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
    document.getElementById('loginForm').classList.toggle('active-form',  mode === 'login');
    document.getElementById('signupForm').classList.toggle('active-form', mode === 'signup');
    clearAuthErrors();
}

function clearAuthErrors() {
    ['loginError','signupError','signupSuccess'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.add('hidden'); el.textContent = ''; }
    });
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPassword').value;
    clearAuthErrors();
    setAuthLoading('loginBtn', true);
    const { error } = await _supabase.auth.signInWithPassword({ email, password: pass });
    if (error) showAuthError('loginError', 'Invalid email or password.');
    setAuthLoading('loginBtn', false);
}

async function handleSignup() {
    const name  = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const pass  = document.getElementById('signupPassword').value;
    const role  = document.getElementById('signupRole').value;
    clearAuthErrors();
    if (pass.length < 6) return showAuthError('signupError', 'Password must be at least 6 characters.');
    setAuthLoading('signupBtn', true);
    const { error } = await _supabase.auth.signUp({
        email, password: pass,
        options: { data: { name, role } }
    });
    if (error) {
        showAuthError('signupError', error.message.includes('already') ? 'Email already registered.' : 'Sign up failed. Check your details.');
    } else {
        const el = document.getElementById('signupSuccess');
        el.classList.remove('hidden');
        el.textContent = 'Account created! Sign in now.';
        setTimeout(() => toggleAuth('login'), 2000);
    }
    setAuthLoading('signupBtn', false);
}

async function handleLogout() {
    if (_supabase) await _supabase.auth.signOut();
}

function setAuthLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    btn.disabled = loading;
    btn.querySelector('span').textContent = loading ? 'Please wait…'
        : btnId === 'loginBtn' ? 'Sign In' : 'Create Account';
}

function showAuthError(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.classList.remove('hidden');
}

/* ── User Metadata ──────────────────────────────────────── */
async function loadUserMeta(user) {
    const { data } = await _supabase
        .from('profiles')
        .select('name, role, email')
        .eq('id', user.id)
        .single();
    currentUserMeta = data || {
        name:  user.user_metadata?.name  || user.email.split('@')[0],
        role:  user.user_metadata?.role  || 'student',
        email: user.email
    };
}

/* ── Dashboard Build ────────────────────────────────────── */
function buildDashboard() {
    const { name, role } = currentUserMeta;
    const initial = (name || '?').charAt(0).toUpperCase();

    document.getElementById('sidebarUserName').textContent   = name;
    document.getElementById('sidebarRoleLabel').textContent  = roleLabel(role);
    document.getElementById('sidebarAvatar').textContent     = initial;
    document.getElementById('headerRoleName').textContent    = roleLabel(role);

    const menu = document.getElementById('sidebarMenu');

    if (role === 'student') {
        menu.innerHTML = `
            <li class="active" onclick="navigate('student',this)">
                <i class="fas fa-folder-open"></i><span>My Projects</span>
            </li>
            <li onclick="navigate('profile',this)">
                <i class="fas fa-user-circle"></i><span>Profile</span>
            </li>`;
        navigate('student', menu.querySelector('li'));

    } else if (role === 'doctor') {
        menu.innerHTML = `
            <li class="active" onclick="navigate('doctor',this)">
                <i class="fas fa-chalkboard-teacher"></i><span>Supervision</span>
            </li>
            <li onclick="navigate('profile',this)">
                <i class="fas fa-user-circle"></i><span>Profile</span>
            </li>`;
        navigate('doctor', menu.querySelector('li'));

    } else if (role === 'admin') {
        menu.innerHTML = `
            <li class="active" onclick="navigate('admin',this)">
                <i class="fas fa-tachometer-alt"></i><span>Admin Panel</span>
            </li>
            <li onclick="navigate('profile',this)">
                <i class="fas fa-user-circle"></i><span>Profile</span>
            </li>`;
        navigate('admin', menu.querySelector('li'));
    }

    loadNotificationCount();
}

function roleLabel(role) {
    return role === 'student' ? 'Student' : role === 'doctor' ? 'Supervisor' : 'Admin';
}

function navigate(viewId, el) {
    document.querySelectorAll('#sidebarMenu li').forEach(li => li.classList.remove('active'));
    if (el) el.classList.add('active');
    document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden'));

    const section = document.getElementById(`view-${viewId}`);
    if (!section) return;
    section.classList.remove('hidden');

    const titles = { student: 'My Projects', doctor: 'Project Supervision', admin: 'Admin Panel', profile: 'My Profile' };
    document.getElementById('pageTitle').textContent = titles[viewId] || '';

    if (viewId === 'student') loadStudentView();
    if (viewId === 'doctor')  loadDoctorView();
    if (viewId === 'admin')   loadAdminView();
    if (viewId === 'profile') loadProfile();
}

/* ── Student View ───────────────────────────────────────── */
async function loadStudentView() {
    const { data: doctors } = await _supabase
        .from('profiles').select('id, name').eq('role', 'doctor');

    const picker = document.getElementById('projectDoctorPicker');
    if (picker) {
        picker.innerHTML = '<option value="">— Select Supervisor —</option>' +
            (doctors || []).map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join('');
    }

    const { data: projects } = await _supabase
        .from('projects')
        .select('id, title, description, status, created_at, doctor_id, profiles!projects_doctor_id_fkey(name)')
        .eq('student_id', currentUser.id)
        .order('created_at', { ascending: false });

    renderStudentProjects(projects || []);
}

function renderStudentProjects(projects) {
    const container = document.getElementById('studentProjectsList');
    if (!projects.length) {
        container.innerHTML = `
            <div class="empty-state-card">
                <i class="fas fa-folder-open"></i>
                <p>No projects yet. Submit your first project above!</p>
            </div>`;
        return;
    }
    container.innerHTML = projects.map(p => `
        <div class="project-card" onclick="openProjectDetail('${p.id}')">
            <div class="project-card-header">
                <div class="project-card-info">
                    <h3 class="project-card-title">${esc(p.title)}</h3>
                    <p class="project-card-desc">${esc(p.description || 'No description provided.')}</p>
                </div>
                <span class="status-badge status-${p.status.replace(/\s/g,'-')}">${statusEmoji(p.status)} ${esc(p.status)}</span>
            </div>
            <div class="project-card-footer">
                <span><i class="fas fa-user-tie"></i> ${esc(p.profiles?.name || 'Unassigned')}</span>
                <span><i class="fas fa-calendar-alt"></i> ${formatDate(p.created_at)}</span>
                <span class="project-card-link">View & Comments <i class="fas fa-arrow-right"></i></span>
            </div>
            ${renderStatusTimeline(p.status)}
        </div>
    `).join('');
}

function renderStatusTimeline(currentStatus) {
    const mainSteps  = ['Pending', 'In Progress', 'Under Review'];
    const termStates = { 'Approved': 'approved', 'Rejected': 'rejected', 'Completed': 'completed' };
    const isTerm     = Object.keys(termStates).includes(currentStatus);
    const mainIdx    = mainSteps.indexOf(currentStatus);

    const dots = mainSteps.map((step, i) => {
        let cls = 'step-dot';
        if (isTerm || i < mainIdx) cls += ' done';
        else if (i === mainIdx)    cls += ' active';
        return `<div class="timeline-step">
            <div class="${cls}"></div>
            <span>${step}</span>
        </div>`;
    }).join('<div class="timeline-line"></div>');

    const termDot = isTerm
        ? `<div class="timeline-line"></div>
           <div class="timeline-step">
               <div class="step-dot done ${termStates[currentStatus]}"></div>
               <span>${currentStatus}</span>
           </div>`
        : '';

    return `<div class="status-timeline">${dots}${termDot}</div>`;
}

async function submitProject() {
    const title    = document.getElementById('projectTitle').value.trim();
    const desc     = document.getElementById('projectDesc').value.trim();
    const doctorId = document.getElementById('projectDoctorPicker').value;

    if (!title)    return showToast('Please enter a project title', 'error');
    if (!doctorId) return showToast('Please select a supervisor', 'error');

    const btn = document.getElementById('submitProjectBtn');
    btn.disabled = true;

    const { data, error } = await _supabase
        .from('projects')
        .insert({ title, description: desc, student_id: currentUser.id, doctor_id: doctorId, status: 'Pending' })
        .select().single();

    if (error) {
        showToast('Failed to submit project', 'error');
    } else {
        document.getElementById('projectTitle').value = '';
        document.getElementById('projectDesc').value  = '';
        document.getElementById('projectDoctorPicker').value = '';
        showToast('Project submitted successfully!');
        await _supabase.from('notifications').insert({
            user_id:   doctorId,
            message:   `New project "${title}" submitted by ${currentUserMeta.name} — awaiting your review.`,
            link_type: 'project',
            link_id:   data.id
        });
        loadStudentView();
    }
    btn.disabled = false;
}

/* ── Doctor View ────────────────────────────────────────── */
async function loadDoctorView() {
    const { data: projects } = await _supabase
        .from('projects')
        .select('id, title, description, status, created_at, student_id, profiles!projects_student_id_fkey(name, email)')
        .eq('doctor_id', currentUser.id)
        .order('created_at', { ascending: false });

    renderDoctorStats(projects || []);
    renderDoctorProjects(projects || []);
}

function renderDoctorStats(projects) {
    const total   = projects.length;
    const pending = projects.filter(p => p.status === 'Pending').length;
    const review  = projects.filter(p => p.status === 'Under Review').length;
    const done    = projects.filter(p => ['Completed','Approved'].includes(p.status)).length;

    document.getElementById('doctorStats').innerHTML = `
        <div class="stat-card"><div class="stat-icon-wrap" style="background:rgba(99,102,241,0.12)">
            <i class="fas fa-project-diagram" style="color:#6366f1"></i></div>
            <div class="stat-info"><h4>Total Supervised</h4><p>${total}</p></div></div>
        <div class="stat-card"><div class="stat-icon-wrap" style="background:rgba(239,68,68,0.12)">
            <i class="fas fa-clock" style="color:#ef4444"></i></div>
            <div class="stat-info"><h4>Pending</h4><p>${pending}</p></div></div>
        <div class="stat-card"><div class="stat-icon-wrap" style="background:rgba(245,158,11,0.12)">
            <i class="fas fa-search" style="color:#f59e0b"></i></div>
            <div class="stat-info"><h4>Under Review</h4><p>${review}</p></div></div>
        <div class="stat-card"><div class="stat-icon-wrap" style="background:rgba(16,185,129,0.12)">
            <i class="fas fa-check-double" style="color:#10b981"></i></div>
            <div class="stat-info"><h4>Completed</h4><p>${done}</p></div></div>
    `;
}

function renderDoctorProjects(projects) {
    const container = document.getElementById('doctorProjectsList');
    if (!projects.length) {
        container.innerHTML = `<div class="empty-state-card"><i class="fas fa-inbox"></i><p>No projects assigned yet.</p></div>`;
        return;
    }
    container.innerHTML = projects.map(p => `
        <div class="project-card supervisor-card">
            <div class="project-card-header" onclick="openProjectDetail('${p.id}')" style="cursor:pointer">
                <div class="project-card-info">
                    <h3 class="project-card-title">${esc(p.title)}</h3>
                    <p class="project-card-desc">${esc(p.description || 'No description.')}</p>
                </div>
                <span class="status-badge status-${p.status.replace(/\s/g,'-')}">${statusEmoji(p.status)} ${esc(p.status)}</span>
            </div>
            <div class="project-card-footer" onclick="openProjectDetail('${p.id}')" style="cursor:pointer">
                <span><i class="fas fa-user-graduate"></i> ${esc(p.profiles?.name || 'Student')}</span>
                <span style="font-size:0.8rem;color:var(--text-muted)">${esc(p.profiles?.email || '')}</span>
                <span class="project-card-link">Open & Comment <i class="fas fa-arrow-right"></i></span>
            </div>
            <div class="doctor-actions">
                <span class="actions-label">Change Status:</span>
                ${['In Progress','Under Review','Approved','Rejected','Completed'].map(s =>
                    `<button class="status-action-btn ${s === p.status ? 'active-status' : ''}"
                        onclick="quickChangeStatus('${p.id}','${s}','${p.student_id}','${esc(p.title)}')">${s}</button>`
                ).join('')}
            </div>
        </div>
    `).join('');
}

async function quickChangeStatus(projectId, newStatus, studentId, title) {
    if (newStatus === 'Rejected') {
        openProjectDetail(projectId, true);
        return;
    }
    const { error } = await _supabase
        .from('projects')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', projectId);

    if (!error) {
        showToast(`Status → "${newStatus}"`);
        await _supabase.from('notifications').insert({
            user_id:   studentId,
            message:   `Your project "${title}" status changed to "${newStatus}" by your supervisor.`,
            link_type: 'project',
            link_id:   projectId
        });
        loadDoctorView();
    } else {
        showToast('Failed to update status', 'error');
    }
}

/* ── Project Detail Modal ───────────────────────────────── */
async function openProjectDetail(projectId, forceRejectComment = false) {
    activeProjectId = projectId;
    const modal = document.getElementById('projectDetailModal');
    modal.classList.remove('hidden');
    document.getElementById('commentsContainer').innerHTML =
        `<div style="text-align:center;padding:30px;color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i></div>`;

    const { data: p } = await _supabase
        .from('projects')
        .select(`id, title, description, status, created_at, updated_at,
                 student_id, doctor_id,
                 student:profiles!projects_student_id_fkey(name, email),
                 doctor:profiles!projects_doctor_id_fkey(name)`)
        .eq('id', projectId)
        .single();

    if (!p) { closeProjectDetail(); return; }

    document.getElementById('modalProjectTitle').textContent  = p.title;
    document.getElementById('modalProjectDesc').textContent   = p.description || '—';
    document.getElementById('modalProjectStatus').innerHTML   =
        `<span class="status-badge status-${p.status.replace(/\s/g,'-')}">${statusEmoji(p.status)} ${p.status}</span>`;
    document.getElementById('modalProjectMeta').innerHTML = `
        <span><i class="fas fa-user-graduate"></i> ${esc(p.student?.name || '—')}</span>
        <span><i class="fas fa-user-tie"></i> ${esc(p.doctor?.name || 'Unassigned')}</span>
        <span><i class="fas fa-calendar-alt"></i> ${formatDate(p.created_at)}</span>
    `;
    document.getElementById('modalTimeline').innerHTML = renderStatusTimeline(p.status);

    const role = currentUserMeta.role;
    const canControl = (role === 'doctor' && p.doctor_id === currentUser.id) || role === 'admin';
    document.getElementById('modalStatusActions').innerHTML = canControl
        ? `<div class="doctor-actions" style="margin-top:0">
            <span class="actions-label">Change Status:</span>
            ${['In Progress','Under Review','Approved','Rejected','Completed'].map(s =>
                `<button class="status-action-btn ${s === p.status ? 'active-status' : ''}"
                    onclick="changeStatusFromModal('${p.id}','${s}','${p.student_id}','${esc(p.title)}')">${s}</button>`
            ).join('')}
        </div>` : '';

    loadComments(projectId);

    if (forceRejectComment) {
        const input = document.getElementById('commentInput');
        input.placeholder = 'Required: add a rejection reason before rejecting…';
        input.focus();
        showToast('Add a rejection reason in the comments, then click "Rejected".', 'error', 5000);
    }
}

function closeProjectDetail() {
    document.getElementById('projectDetailModal').classList.add('hidden');
    document.getElementById('commentInput').placeholder = 'Write a comment or feedback…';
    activeProjectId = null;
}

async function changeStatusFromModal(projectId, newStatus, studentId, title) {
    if (newStatus === 'Rejected') {
        const body = document.getElementById('commentInput').value.trim();
        if (!body) {
            showToast('Please write a rejection reason in the comments box first.', 'error', 4000);
            document.getElementById('commentInput').focus();
            return;
        }
        await _supabase.from('comments').insert({
            project_id: projectId,
            author_id:  currentUser.id,
            body: `⚠️ Rejection Reason: ${body}`
        });
        document.getElementById('commentInput').value = '';
    }

    const { error } = await _supabase
        .from('projects')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', projectId);

    if (!error) {
        showToast(`Status updated to "${newStatus}"`);
        await _supabase.from('notifications').insert({
            user_id:   studentId,
            message:   `Your project "${title}" status changed to "${newStatus}".`,
            link_type: 'project',
            link_id:   projectId
        });
        openProjectDetail(projectId);
        if (currentUserMeta.role === 'doctor') loadDoctorView();
        if (currentUserMeta.role === 'admin')  loadAdminView();
    } else {
        showToast('Failed to update status', 'error');
    }
}

async function loadComments(projectId) {
    const { data: comments } = await _supabase
        .from('comments')
        .select('id, body, created_at, author_id, profiles(name, role)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

    const container = document.getElementById('commentsContainer');
    if (!comments?.length) {
        container.innerHTML = `<p class="no-comments-msg">No comments yet. Start the conversation!</p>`;
        return;
    }
    container.innerHTML = comments.map(c => {
        const isMe    = c.author_id === currentUser.id;
        const roleTag = c.profiles?.role === 'doctor' ? '👨‍🏫' : c.profiles?.role === 'admin' ? '🔑' : '🎓';
        return `
            <div class="comment-bubble ${isMe ? 'comment-mine' : 'comment-other'}">
                <div class="comment-author">${roleTag} ${esc(c.profiles?.name || 'User')}</div>
                <div class="comment-body">${esc(c.body)}</div>
                <div class="comment-time">${formatDate(c.created_at, true)}</div>
            </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
}

async function sendComment() {
    if (!activeProjectId) return;
    const input = document.getElementById('commentInput');
    const body  = input.value.trim();
    if (!body) return;

    const btn = document.getElementById('sendCommentBtn');
    btn.disabled = true;

    const { error } = await _supabase.from('comments').insert({
        project_id: activeProjectId,
        author_id:  currentUser.id,
        body
    });

    if (!error) {
        input.value = '';
        const { data: p } = await _supabase
            .from('projects').select('student_id, doctor_id, title').eq('id', activeProjectId).single();
        if (p) {
            const notifyId = currentUser.id === p.student_id ? p.doctor_id : p.student_id;
            if (notifyId) {
                await _supabase.from('notifications').insert({
                    user_id:   notifyId,
                    message:   `${currentUserMeta.name} left a comment on "${p.title}".`,
                    link_type: 'project',
                    link_id:   activeProjectId
                });
            }
        }
        loadComments(activeProjectId);
        loadNotificationCount();
    } else {
        showToast('Failed to send comment', 'error');
    }
    btn.disabled = false;
}

/* ── Admin View ─────────────────────────────────────────── */
async function loadAdminView() {
    const [{ data: profiles }, { data: projects }] = await Promise.all([
        _supabase.from('profiles').select('*').order('role'),
        _supabase.from('projects')
            .select(`id, title, description, status, created_at,
                     student:profiles!projects_student_id_fkey(name),
                     doctor:profiles!projects_doctor_id_fkey(name)`)
            .order('created_at', { ascending: false })
    ]);

    renderAdminStats(profiles || [], projects || []);
    renderUsersTable(profiles || []);
    renderAdminProjectsTable(projects || []);
    renderAdminChart(projects || []);
}

function renderAdminStats(profiles, projects) {
    const students = profiles.filter(p => p.role === 'student').length;
    const doctors  = profiles.filter(p => p.role === 'doctor').length;
    const total    = projects.length;
    const active   = projects.filter(p => !['Completed','Approved','Rejected'].includes(p.status)).length;

    document.getElementById('adminStats').innerHTML = `
        <div class="stat-card"><div class="stat-icon-wrap" style="background:rgba(99,102,241,0.12)">
            <i class="fas fa-users" style="color:#6366f1"></i></div>
            <div class="stat-info"><h4>Total Users</h4><p>${profiles.length}</p></div></div>
        <div class="stat-card"><div class="stat-icon-wrap" style="background:rgba(59,130,246,0.12)">
            <i class="fas fa-user-graduate" style="color:#3b82f6"></i></div>
            <div class="stat-info"><h4>Students</h4><p>${students}</p></div></div>
        <div class="stat-card"><div class="stat-icon-wrap" style="background:rgba(16,185,129,0.12)">
            <i class="fas fa-chalkboard-teacher" style="color:#10b981"></i></div>
            <div class="stat-info"><h4>Supervisors</h4><p>${doctors}</p></div></div>
        <div class="stat-card"><div class="stat-icon-wrap" style="background:rgba(245,158,11,0.12)">
            <i class="fas fa-tasks" style="color:#f59e0b"></i></div>
            <div class="stat-info"><h4>Total Projects</h4><p>${total}</p></div></div>
        <div class="stat-card"><div class="stat-icon-wrap" style="background:rgba(239,68,68,0.12)">
            <i class="fas fa-folder-open" style="color:#ef4444"></i></div>
            <div class="stat-info"><h4>Active Projects</h4><p>${active}</p></div></div>
    `;
}

function renderUsersTable(profiles) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = profiles.map(p => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:10px">
                    <div class="mini-avatar">${(p.name||'?').charAt(0).toUpperCase()}</div>
                    <strong>${esc(p.name || '—')}</strong>
                </div>
            </td>
            <td style="color:var(--text-muted);font-size:0.85rem">${esc(p.email || '—')}</td>
            <td>
                <select class="role-select" onchange="changeUserRole('${p.id}', this.value)"
                    ${p.id === currentUser.id ? 'disabled title="Cannot change your own role"' : ''}>
                    <option value="student" ${p.role === 'student' ? 'selected' : ''}>Student</option>
                    <option value="doctor"  ${p.role === 'doctor'  ? 'selected' : ''}>Supervisor</option>
                    <option value="admin"   ${p.role === 'admin'   ? 'selected' : ''}>Admin</option>
                </select>
            </td>
            <td><span class="role-badge role-${p.role}">${roleLabel(p.role)}</span></td>
        </tr>
    `).join('');
}

async function changeUserRole(userId, newRole) {
    const { error } = await _supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (!error) showToast(`Role updated to ${roleLabel(newRole)}`);
    else        showToast('Failed to update role', 'error');
}

function renderAdminProjectsTable(projects) {
    const tbody = document.getElementById('adminProjectsBody');
    if (!projects.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted)">No projects found.</td></tr>`;
        return;
    }
    tbody.innerHTML = projects.map(p => `
        <tr>
            <td><strong>${esc(p.title)}</strong></td>
            <td style="font-size:0.85rem;color:var(--text-muted)">${esc(p.student?.name || '—')}</td>
            <td style="font-size:0.85rem;color:var(--text-muted)">${esc(p.doctor?.name || 'Unassigned')}</td>
            <td><span class="status-badge status-${p.status.replace(/\s/g,'-')}">${statusEmoji(p.status)} ${esc(p.status)}</span></td>
            <td>
                <button class="btn-icon edit" onclick="openProjectDetail('${p.id}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon delete" onclick="adminDeleteProject('${p.id}')" title="Delete" style="margin-right:6px">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function adminDeleteProject(id) {
    if (!confirm('Delete this project permanently? This action cannot be undone.')) return;
    const { error } = await _supabase.from('projects').delete().eq('id', id);
    if (!error) { showToast('Project deleted'); loadAdminView(); }
    else          showToast('Failed to delete project', 'error');
}

function renderAdminChart(projects) {
    const stages = ['Pending','In Progress','Under Review','Approved','Rejected','Completed'];
    const counts = stages.map(s => projects.filter(p => p.status === s).length);
    const colors = ['#94a3b8','#60a5fa','#f59e0b','#4ade80','#f87171','#6366f1'];

    const ctx = document.getElementById('adminChart');
    if (!ctx) return;
    if (platformChartInstance) platformChartInstance.destroy();

    platformChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: stages,
            datasets: [{
                data: counts,
                backgroundColor: colors,
                borderWidth: 3,
                borderColor: 'var(--card-bg)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } }
            }
        }
    });
}

async function sendAnnouncement() {
    const msg = document.getElementById('announcementText').value.trim();
    if (!msg) return showToast('Please enter an announcement message', 'error');

    const btn = document.getElementById('sendAnnouncementBtn');
    btn.disabled = true;

    const { data: profiles } = await _supabase.from('profiles').select('id');
    if (!profiles?.length) { btn.disabled = false; return; }

    const inserts = profiles.map(p => ({
        user_id: p.id, message: `📢 ${msg}`, link_type: 'announcement', is_read: false
    }));

    const { error } = await _supabase.from('notifications').insert(inserts);
    if (!error) {
        document.getElementById('announcementText').value = '';
        showToast(`Announcement sent to ${profiles.length} users!`);
    } else {
        showToast('Failed to send announcement', 'error');
    }
    btn.disabled = false;
}

/* ── Notifications ──────────────────────────────────────── */
async function loadNotificationCount() {
    if (!currentUser) return;
    const { count } = await _supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
        .eq('is_read', false);

    const badge = document.getElementById('notifBadge');
    if (count > 0) {
        badge.textContent = count > 9 ? '9+' : count;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

async function toggleNotifications() {
    const panel = document.getElementById('notifPanel');
    if (!panel.classList.contains('hidden')) {
        panel.classList.add('hidden');
        return;
    }
    panel.classList.remove('hidden');

    const { data: notifs } = await _supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(25);

    const container = document.getElementById('notifList');
    if (!notifs?.length) {
        container.innerHTML = `<p class="notif-empty">You're all caught up! No notifications.</p>`;
    } else {
        container.innerHTML = notifs.map(n => `
            <div class="notif-item ${n.is_read ? '' : 'notif-unread'}"
                 onclick="handleNotifClick('${n.id}','${n.link_id || ''}','${n.link_type || ''}')">
                <div class="notif-icon-wrap">
                    <i class="fas ${n.link_type === 'announcement' ? 'fa-bullhorn' : 'fa-bell'}"></i>
                </div>
                <div class="notif-content">
                    <p class="notif-msg">${esc(n.message)}</p>
                    <p class="notif-time">${formatDate(n.created_at, true)}</p>
                </div>
            </div>
        `).join('');
    }

    await _supabase.from('notifications').update({ is_read: true })
        .eq('user_id', currentUser.id).eq('is_read', false);
    loadNotificationCount();
}

async function handleNotifClick(notifId, linkId, linkType) {
    document.getElementById('notifPanel').classList.add('hidden');
    if (linkType === 'project' && linkId && linkId !== 'undefined' && linkId !== '') {
        openProjectDetail(linkId);
    }
}

/* ── Profile ────────────────────────────────────────────── */
function loadProfile() {
    const { name, role, email } = currentUserMeta;
    document.getElementById('profileAvatarBig').textContent   = (name || '?').charAt(0).toUpperCase();
    document.getElementById('profileNameDisplay').textContent  = name  || '—';
    document.getElementById('profileEmailDisplay').textContent = email || '—';
    document.getElementById('profileRoleBadge').textContent    = roleLabel(role);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.getElementById('darkModeToggle').checked = isDark;
}

/* ── Theme ──────────────────────────────────────────────── */
function toggleTheme() {
    const html  = document.documentElement;
    const next  = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
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

/* ── Sidebar ────────────────────────────────────────────── */
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.querySelector('.main-area').classList.toggle('sidebar-collapsed');
}

/* ── Toast ──────────────────────────────────────────────── */
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

/* ── Helpers ────────────────────────────────────────────── */
function esc(str) {
    return String(str || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
        .replace(/'/g,'&#39;');
}

function statusEmoji(s) {
    const map = { 'Pending':'📋','In Progress':'⚙️','Under Review':'🔍','Approved':'✅','Rejected':'❌','Completed':'🏁' };
    return map[s] || '📁';
}

function formatDate(iso, withTime = false) {
    if (!iso) return '—';
    const d    = new Date(iso);
    const date = d.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
    return withTime ? `${date} · ${time}` : date;
}

document.addEventListener('click', e => {
    const panel = document.getElementById('notifPanel');
    if (panel && !panel.classList.contains('hidden') &&
        !panel.contains(e.target) &&
        !document.getElementById('notifBtn')?.contains(e.target)) {
        panel.classList.add('hidden');
    }
    if (e.target.id === 'projectDetailModal') closeProjectDetail();
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeProjectDetail();
        document.getElementById('notifPanel')?.classList.add('hidden');
    }
});
