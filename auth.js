document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const errorMsg = document.getElementById("error-msg");
    const loginBtn = document.getElementById("login-btn");

    // Check if user is already logged in
    checkSession();

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        loginBtn.textContent = "Authenticating...";
        errorMsg.style.display = "none";

        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Verify Membership Status
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('status')
                .eq('id', data.user.id)
                .single();

            if (profileError) throw profileError;

            if (profile.status === 'inactive') {
                await supabase.auth.signOut();
                showError("Your SupremeFX membership is currently inactive.");
                return;
            }

            // Success - Redirect to Dashboard
            window.location.href = "dashboard.html";

        } catch (error) {
            showError(error.message);
        } finally {
            loginBtn.textContent = "Access Terminal";
        }
    });

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = "block";
    }

    async function checkSession() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            window.location.href = "dashboard.html";
        }
    }
});
