document.addEventListener("DOMContentLoaded", async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const user = session.user;

        // Retrieve extra profile info from DB
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        const fullName = profile?.full_name || user.email.split('@')[0];
        const initials = fullName.substring(0, 2).toUpperCase();

        document.getElementById('profile-avatar').textContent = initials;
        document.getElementById('profile-name').textContent = fullName;
        document.getElementById('profile-email').textContent = user.email;
        document.getElementById('profile-broker').textContent = profile?.broker || 'Connected Broker';
        document.getElementById('profile-tier').textContent = profile?.trading_level || 'Beginner';
        document.getElementById('profile-joined').textContent = new Date(profile?.created_at || user.created_at).toLocaleDateString();
        document.getElementById('profile-uid').textContent = user.id;

        const statusBadge = document.getElementById('profile-status-badge');
        if (profile?.status === 'active' || profile?.status === 'admin') {
            statusBadge.textContent = profile.status.toUpperCase() + " MEMBER";
        } else {
            statusBadge.textContent = "INACTIVE MEMBER";
            statusBadge.style.color = "var(--loss-red)";
            statusBadge.style.borderColor = "var(--loss-red)";
        }

    } catch (err) {
        console.error("Error loading profile layout:", err.message);
    }
});
