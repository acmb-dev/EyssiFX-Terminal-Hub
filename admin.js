document.addEventListener("DOMContentLoaded", async () => {
    // Check if current authenticated user has administrative privilege
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', session.user.id)
        .single();

    if (profile?.status !== 'admin') {
        // Hide Admin navigation link for standard members
        const adminNavLink = document.querySelector('[data-target="admin"]');
        if (adminNavLink) adminNavLink.style.display = "none";
        return;
    }

    // Load registered users if admin
    loadAdminUsers();

    async function loadAdminUsers() {
        try {
            const { data: users, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            document.getElementById('admin-stat-users').textContent = users.length;
            document.getElementById('admin-stat-active').textContent = users.filter(u => u.status === 'active' || u.status === 'admin').length;
            document.getElementById('admin-stat-pending').textContent = users.filter(u => u.status === 'inactive').length;

            const tableBody = document.getElementById('admin-users-table-body');
            tableBody.innerHTML = users.map(u => {
                const isApproved = u.status === 'active' || u.status === 'admin';
                return `
                    <tr>
                        <td><strong>${u.full_name || 'Member'}</strong></td>
                        <td>${u.email}</td>
                        <td>${u.broker || 'N/A'}</td>
                        <td>${new Date(u.created_at).toLocaleDateString()}</td>
                        <td>
                            <span class="badge-result ${isApproved ? 'result-won' : 'result-lost'}">
                                ${u.status.toUpperCase()}
                            </span>
                        </td>
                        <td>
                            <button onclick="toggleMemberStatus('${u.id}', '${u.status}')" class="btn-asset" style="padding: 4px 10px; font-size: 0.75rem;">
                                ${isApproved ? 'Deactivate' : 'Approve'}
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

        } catch (err) {
            console.error("Error loading admin users:", err.message);
        }
    }

    window.toggleMemberStatus = async function(userId, currentStatus) {
        const newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ status: newStatus })
                .eq('id', userId);

            if (error) throw error;
            loadAdminUsers();
        } catch (err) {
            console.error("Failed to update membership status:", err.message);
        }
    };
});
