document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initMobileMenu();
    initLogout();
});

// Sidebar View Switcher
function initNavigation() {
    const navLinks = document.querySelectorAll(".sidebar-nav .nav-link");
    const views = document.querySelectorAll(".view-section");

    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            
            const targetViewId = link.getAttribute("data-target");
            if (!targetViewId) return;

            // Update active state on navigation links
            navLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");

            // Toggle view visibility
            views.forEach(view => {
                if (view.id === `view-${targetViewId}`) {
                    view.classList.add("active");
                } else {
                    view.classList.remove("active");
                }
            });

            // Close mobile sidebar if open
            const sidebar = document.getElementById("sidebar");
            if (sidebar.classList.contains("open")) {
                sidebar.classList.remove("open");
            }
        });
    });
}

// Mobile Responsive Drawer Toggle
function initMobileMenu() {
    const mobileBtn = document.getElementById("mobile-menu-btn");
    const sidebar = document.getElementById("sidebar");

    if (mobileBtn && sidebar) {
        mobileBtn.addEventListener("click", () => {
            sidebar.classList.toggle("open");
        });
    }
}

// Handle Logout Button
function initLogout() {
    const logoutBtn = document.getElementById("logout-btn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            try {
                await supabase.auth.signOut();
                window.location.href = "index.html";
            } catch (err) {
                console.error("Error signing out:", err.message);
            }
        });
    }
}
