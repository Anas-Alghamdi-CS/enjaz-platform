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
    await sleep(1200);
    document.getElementById('splashScreen').classList.add('fade-out');
    await sleep(500);
    document.getElementById('splashScreen').classList.add('hidden');

    if (!initSupabase()) {
        // Always show the auth screen so the user never sees a blank page
        showAuth();
        showAuthError('loginError', 'Failed to connect to the database.');
        return;
    }

    try {
        const { data: { session } } = await _supabase.auth.getSession();
        await applySession(session);
    } catch (e) {
        console.error('Session restore failed:', e);
        showAuth();
    }

    _supabase.auth.onAuthStateChange((event, session) => {
        if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') return;
        // SIGNED_IN also fires on tab refocus; ignore it when the same user is already loaded
        if (event === 'SIGNED_IN' && session?.user?.id === currentUser?.id) return;
        // Defer to avoid deadlocking the Supabase auth lock from inside the callback
        setTimeout(() => applySession(session), 0);
    });
});

async function applySession(session) {
    if (session?.user) {
        currentUser = session.user;
        await loadUserMeta(session.user);
        showDashboard();
    } else {
        stopRealtime();
        currentUser     = null;
        currentUserMeta = {};
        activeProjectId = null;
        showAuth();
    }
}

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
    if (!email || !pass) return showAuthError('loginError', 'Please enter your email and password.');
    setAuthLoading('loginBtn', true);
    try {
        const { error } = await _supabase.auth.signInWithPassword({ email, password: pass });
        if (error) showAuthError('loginError', 'Invalid email or password.');
    } catch (e) {
        console.error('Login failed:', e);
        showAuthError('loginError', 'Network error. Please try again.');
    } finally {
        setAuthLoading('loginBtn', false);
    }
}

async function handleSignup() {
    const name  = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const pass  = document.getElementById('signupPassword').value;
    const role  = document.getElementById('signupRole').value;
    clearAuthErrors();
    if (!name || !email) return showAuthError('signupError', 'Please enter your name and email.');
    if (pass.length < 6) return showAuthError('signupError', 'Password must be at least 6 characters.');
    setAuthLoading('signupBtn', true);
    try {
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
    } catch (e) {
        console.error('Signup failed:', e);
        showAuthError('signupError', 'Network error. Please try again.');
    } finally {
        setAuthLoading('signupBtn', false);
    }
}

async function handleLogout() {
    try {
        if (_supabase) await _supabase.auth.signOut();
    } catch (e) {
        console.error('Logout failed:', e);
        showToast('Failed to sign out', 'error');
    }
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
    let data = null;
    try {
        const res = await _supabase
            .from('profiles')
            .select('name, role, email')
            .eq('id', user.id)
            .maybeSingle();
        data = res.data;
    } catch (e) {
        console.error('Profile load failed:', e);
    }
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
    startRealtime();
}

/* ── Realtime (comments + notifications) ────────────────── */
let realtimeChannel = null;
let notifPollTimer  = null;

function startRealtime() {
    stopRealtime();
    try {
        realtimeChannel = _supabase.channel(`enjaz-${currentUser.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, payload => {
                if (payload.new?.project_id === activeProjectId) loadComments(activeProjectId);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications',
                                      filter: `user_id=eq.${currentUser.id}` }, () => loadNotificationCount())
            .subscribe();
    } catch (e) {
        console.error('Realtime unavailable:', e);
    }
    // Polling fallback in case Realtime is not enabled for these tables
    notifPollTimer = setInterval(() => {
        loadNotificationCount();
        if (activeProjectId) loadComments(activeProjectId);
    }, 30000);
}

function stopRealtime() {
    if (realtimeChannel) { _supabase?.removeChannel(realtimeChannel); realtimeChannel = null; }
    if (notifPollTimer)  { clearInterval(notifPollTimer); notifPollTimer = null; }
}

/* Fetch a { id: profile } map for the given ids only */
async function fetchProfileMap(ids) {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return {};
    const { data, error } = await _supabase.from('profiles').select('id, name, email, role').in('id', unique);
    if (error) throw error;
    return Object.fromEntries((data || []).map(p => [p.id, p]));
}

/* Insert a notification without ever blocking the main action */
async function notify(userId, message, linkId = null, linkType = 'project') {
    if (!userId) return;
    try {
        const { error } = await _supabase.from('notifications')
            .insert({ user_id: userId, message, link_type: linkType, link_id: linkId });
        if (error) throw error;
    } catch (e) {
        console.error('Notification insert failed:', e);
    }
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
    try {
        const { data: doctors, error: docErr } = await _supabase
            .from('profiles').select('id, name').eq('role', 'doctor');
        if (docErr) throw docErr;

        const picker = document.getElementById('projectDoctorPicker');
        if (picker) {
            const keep = picker.value;
            picker.innerHTML = '<option value="">— Select Supervisor —</option>' +
                (doctors || []).map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join('');
            picker.value = keep;
        }

        const { data: projectsData, error: projErr } = await _supabase
            .from('projects')
            .select('*')
            .eq('student_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (projErr) throw projErr;

        const map = await fetchProfileMap((projectsData || []).map(p => p.doctor_id));
        const projects = (projectsData || []).map(p => ({
            ...p,
            profiles: { name: map[p.doctor_id]?.name || 'Unknown Doctor' }
        }));

        renderStudentProjects(projects);
    } catch (e) {
        console.error('Student view failed:', e);
        showToast('Failed to load your projects', 'error');
    }
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

    try {
        const { data, error } = await _supabase
            .from('projects')
            .insert({ title, description: desc, student_id: currentUser.id, doctor_id: doctorId, status: 'Pending' })
            .select().single();
        if (error) throw error;

        document.getElementById('projectTitle').value = '';
        document.getElementById('projectDesc').value  = '';
        document.getElementById('projectDoctorPicker').value = '';
        showToast('Project submitted successfully!');
        await notify(doctorId, `New project "${title}" submitted by ${currentUserMeta.name} — awaiting your review.`, data.id);
        loadStudentView();
    } catch (e) {
        console.error('Submit project failed:', e);
        showToast('Failed to submit project', 'error');
    } finally {
        btn.disabled = false;
    }
}

/* ── Doctor View ────────────────────────────────────────── */
async function loadDoctorView() {
    try {
        const { data: projectsData, error: projErr } = await _supabase
            .from('projects')
            .select('*')
            .eq('doctor_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (projErr) throw projErr;

        const map = await fetchProfileMap((projectsData || []).map(p => p.student_id));
        const projects = (projectsData || []).map(p => ({
            ...p,
            profiles: {
                name:  map[p.student_id]?.name  || 'Unknown Student',
                email: map[p.student_id]?.email || ''
            }
        }));

        renderDoctorStats(projects);
        renderDoctorProjects(projects);
    } catch (e) {
        console.error('Doctor view failed:', e);
        showToast('Failed to load supervised projects', 'error');
    }
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
                        onclick="quickChangeStatus('${p.id}','${s}')">${s}</button>`
                ).join('')}
            </div>
        </div>
    `).join('');
}

async function quickChangeStatus(projectId, newStatus) {
    // Rejection needs a written reason, so route it through the detail modal
    if (newStatus === 'Rejected') {
        openProjectDetail(projectId, true);
        return;
    }
    if (await applyStatusChange(projectId, newStatus)) loadDoctorView();
}

/* Single source of truth for status changes. Enforces the rejection-reason rule. */
async function applyStatusChange(projectId, newStatus, reason = '') {
    try {
        if (newStatus === 'Rejected' && !reason.trim()) {
            showToast('A rejection reason is required.', 'error', 4000);
            return false;
        }

        const { data: p, error: pErr } = await _supabase
            .from('projects').select('student_id, title').eq('id', projectId).single();
        if (pErr) throw pErr;

        // Save the reason first so a rejection is never applied without one
        if (newStatus === 'Rejected') {
            const { error: cErr } = await _supabase.from('comments').insert({
                project_id: projectId,
                author_id:  currentUser.id,
                body: `⚠️ Rejection Reason: ${reason.trim()}`
            });
            if (cErr) throw cErr;
        }

        const { error } = await _supabase
            .from('projects')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', projectId);
        if (error) throw error;

        showToast(`Status updated to "${newStatus}"`);
        await notify(p.student_id, `Your project "${p.title}" status changed to "${newStatus}".`, projectId);
        return true;
    } catch (e) {
        console.error('Status change failed:', e);
        showToast('Failed to update status', 'error');
        return false;
    }
}

/* ── Project Detail Modal ───────────────────────────────── */
async function openProjectDetail(projectId, forceRejectComment = false) {
    activeProjectId = projectId;
    const modal = document.getElementById('projectDetailModal');
    modal.classList.remove('hidden');
    delete document.getElementById('commentsContainer').dataset.loaded;
    document.getElementById('commentsContainer').innerHTML =
        `<div style="text-align:center;padding:30px;color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i></div>`;

    let p;
    try {
        const { data: pData, error: pErr } = await _supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();
        if (pErr) throw pErr;

        const map = await fetchProfileMap([pData.student_id, pData.doctor_id]);
        p = {
            ...pData,
            student: { name: map[pData.student_id]?.name || 'Unknown', email: map[pData.student_id]?.email || '' },
            doctor:  { name: map[pData.doctor_id]?.name  || 'Unknown' }
        };
    } catch (e) {
        console.error('Project detail failed:', e);
        showToast('Failed to load project', 'error');
        closeProjectDetail();
        return;
    }

    document.getElementById('modalProjectTitle').textContent  = p.title;
    document.getElementById('modalProjectDesc').textContent   = p.description || '—';
    document.getElementById('modalProjectStatus').innerHTML   =
        `<span class="status-badge status-${p.status.replace(/\s/g,'-')}">${statusEmoji(p.status)} ${esc(p.status)}</span>`;
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
                    onclick="changeStatusFromModal('${p.id}','${s}')">${s}</button>`
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

async function changeStatusFromModal(projectId, newStatus) {
    const input  = document.getElementById('commentInput');
    const reason = newStatus === 'Rejected' ? input.value.trim() : '';

    if (newStatus === 'Rejected' && !reason) {
        showToast('Please write a rejection reason in the comments box first.', 'error', 4000);
        input.focus();
        return;
    }

    if (await applyStatusChange(projectId, newStatus, reason)) {
        if (newStatus === 'Rejected') input.value = '';
        openProjectDetail(projectId);
        if (currentUserMeta.role === 'doctor') loadDoctorView();
        if (currentUserMeta.role === 'admin')  loadAdminView();
    }
}

async function loadComments(projectId) {
    const container = document.getElementById('commentsContainer');
    try {
        const { data: comments, error } = await _supabase
            .from('comments')
            .select('id, body, created_at, author_id')
            .eq('project_id', projectId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        if (projectId !== activeProjectId) return; // modal moved on while we were fetching

        if (!comments?.length) {
            container.innerHTML = `<p class="no-comments-msg">No comments yet. Start the conversation!</p>`;
            return;
        }
        // Join authors in JS to avoid relying on a foreign-key relationship name
        const map = await fetchProfileMap(comments.map(c => c.author_id));
        const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;

        container.innerHTML = comments.map(c => {
            const author  = map[c.author_id];
            const isMe    = c.author_id === currentUser.id;
            const roleTag = author?.role === 'doctor' ? '👨‍🏫' : author?.role === 'admin' ? '🔑' : '🎓';
            return `
                <div class="comment-bubble ${isMe ? 'comment-mine' : 'comment-other'}">
                    <div class="comment-author">${roleTag} ${esc(author?.name || 'User')}</div>
                    <div class="comment-body" dir="auto">${esc(c.body)}</div>
                    <div class="comment-time">${formatDate(c.created_at, true)}</div>
                </div>`;
        }).join('');
        if (nearBottom || !container.dataset.loaded) container.scrollTop = container.scrollHeight;
        container.dataset.loaded = '1';
    } catch (e) {
        console.error('Comments load failed:', e);
        container.innerHTML = `<p class="no-comments-msg">Could not load comments.</p>`;
    }
}

async function sendComment() {
    if (!activeProjectId) return;
    const input = document.getElementById('commentInput');
    const body  = input.value.trim();
    if (!body) return;

    const btn = document.getElementById('sendCommentBtn');
    btn.disabled = true;

    const projectId = activeProjectId;
    try {
        const { error } = await _supabase.from('comments').insert({
            project_id: projectId,
            author_id:  currentUser.id,
            body
        });
        if (error) throw error;

        input.value = '';
        const { data: p } = await _supabase
            .from('projects').select('student_id, doctor_id, title').eq('id', projectId).single();
        if (p) {
            // Notify every participant except the author (covers admin comments too)
            const recipients = [p.student_id, p.doctor_id].filter(id => id && id !== currentUser.id);
            await Promise.all(recipients.map(id =>
                notify(id, `${currentUserMeta.name} left a comment on "${p.title}".`, projectId)));
        }
        loadComments(projectId);
        loadNotificationCount();
    } catch (e) {
        console.error('Send comment failed:', e);
        showToast('Failed to send comment', 'error');
    } finally {
        btn.disabled = false;
    }
}

/* ── Admin View ─────────────────────────────────────────── */
async function loadAdminView() {
    try {
        const [profRes, projRes] = await Promise.all([
            _supabase.from('profiles').select('*').order('role'),
            _supabase.from('projects').select('*').order('created_at', { ascending: false })
        ]);
        if (profRes.error) throw profRes.error;
        if (projRes.error) throw projRes.error;

        const profiles = profRes.data || [];
        const byId     = Object.fromEntries(profiles.map(p => [p.id, p]));
        const projects = (projRes.data || []).map(p => ({
            ...p,
            student: { name: byId[p.student_id]?.name || 'Unknown' },
            doctor:  { name: byId[p.doctor_id]?.name  || 'Unknown' }
        }));

        renderAdminStats(profiles, projects);
        renderUsersTable(profiles);
        renderAdminProjectsTable(projects);
        renderAdminChart(projects);
    } catch (e) {
        console.error('Admin view failed:', e);
        showToast('Failed to load admin data', 'error');
    }
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
    try {
        const { error } = await _supabase.from('profiles').update({ role: newRole }).eq('id', userId);
        if (error) throw error;
        showToast(`Role updated to ${roleLabel(newRole)}`);
        loadAdminView();
    } catch (e) {
        console.error('Role change failed:', e);
        showToast('Failed to update role', 'error');
        loadAdminView(); // reset the dropdown to the stored role
    }
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
    try {
        const { error } = await _supabase.from('projects').delete().eq('id', id);
        if (error) throw error;
        showToast('Project deleted');
        loadAdminView();
    } catch (e) {
        console.error('Delete project failed:', e);
        showToast('Failed to delete project', 'error');
    }
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
                // Canvas cannot resolve CSS variables, so read the computed value
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim() || '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 16,
                        font: { size: 12 },
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim()
                    }
                }
            }
        }
    });
}

async function sendAnnouncement() {
    const msg = document.getElementById('announcementText').value.trim();
    if (!msg) return showToast('Please enter an announcement message', 'error');

    const btn = document.getElementById('sendAnnouncementBtn');
    btn.disabled = true;

    try {
        const { data: profiles, error: pErr } = await _supabase.from('profiles').select('id');
        if (pErr) throw pErr;
        if (!profiles?.length) return showToast('No users to notify', 'error');

        const inserts = profiles.map(p => ({
            user_id: p.id, message: `📢 ${msg}`, link_type: 'announcement', is_read: false
        }));
        const { error } = await _supabase.from('notifications').insert(inserts);
        if (error) throw error;

        document.getElementById('announcementText').value = '';
        showToast(`Announcement sent to ${profiles.length} users!`);
    } catch (e) {
        console.error('Announcement failed:', e);
        showToast('Failed to send announcement', 'error');
    } finally {
        btn.disabled = false;
    }
}

/* ── Notifications ──────────────────────────────────────── */
async function loadNotificationCount() {
    if (!currentUser) return;
    try {
        const { count, error } = await _supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', currentUser.id)
            .eq('is_read', false);
        if (error) throw error;

        const badge = document.getElementById('notifBadge');
        if (count > 0) {
            badge.textContent = count > 9 ? '9+' : count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    } catch (e) {
        console.error('Notification count failed:', e);
    }
}

async function toggleNotifications() {
    const panel = document.getElementById('notifPanel');
    if (!panel.classList.contains('hidden')) {
        panel.classList.add('hidden');
        return;
    }
    panel.classList.remove('hidden');

    const container = document.getElementById('notifList');
    let notifs;
    try {
        const res = await _supabase
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(25);
        if (res.error) throw res.error;
        notifs = res.data;
    } catch (e) {
        console.error('Notifications load failed:', e);
        container.innerHTML = `<p class="notif-empty">Could not load notifications.</p>`;
        return;
    }
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

    try {
        const { error } = await _supabase.from('notifications').update({ is_read: true })
            .eq('user_id', currentUser.id).eq('is_read', false);
        if (error) throw error;
    } catch (e) {
        console.error('Mark-as-read failed:', e);
    }
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
    try { localStorage.setItem('enjazTheme', next); } catch (e) { /* storage blocked */ }
    updateThemeIcon(next);
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = next === 'dark';
    // Chart colours are baked in at draw time, so redraw after a theme switch
    if (currentUserMeta.role === 'admin' && !document.getElementById('view-admin').classList.contains('hidden')) {
        loadAdminView();
    }
}

function applyStoredTheme() {
    let saved = null;
    try { saved = localStorage.getItem('enjazTheme'); } catch (e) { /* storage blocked */ }
    // Fall back to the OS preference on first visit
    if (!saved) saved = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    document.querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', theme === 'dark' ? '#0d1117' : '#f1f5f9');
}

/* ── Sidebar ────────────────────────────────────────────── */
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
    // The grid column width is driven by --sidebar-w on the shell
    document.getElementById('dashboardScreen').classList.toggle('sidebar-collapsed');
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
