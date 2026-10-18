document.addEventListener("DOMContentLoaded", () => {
    const settingsForm = document.getElementById('settings-form');
    
    // Load local settings
    const savedTimezone = localStorage.getItem('sf_timezone') || 'UTC';
    const savedRefresh = localStorage.getItem('sf_refresh') || '180';

    document.getElementById('setting-timezone').value = savedTimezone;
    document.getElementById('setting-refresh').value = savedRefresh;

    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const tz = document.getElementById('setting-timezone').value;
        const ref = document.getElementById('setting-refresh').value;

        localStorage.setItem('sf_timezone', tz);
        localStorage.setItem('sf_refresh', ref);

        alert("SupremeFX Terminal settings saved successfully.");
    });
});
