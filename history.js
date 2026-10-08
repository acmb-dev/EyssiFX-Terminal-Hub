document.addEventListener("DOMContentLoaded", () => {
    let pieChartInstance = null;
    let lineChartInstance = null;

    initHistoryView();

    // Attach Filter Listeners
    const filterButtons = document.querySelectorAll('.history-filters .filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            const filterType = e.target.getAttribute('data-filter');
            fetchAndRenderHistory(filterType);
        });
    });

    async function initHistoryView() {
        await fetchAndRenderHistory('all');
    }

    async function fetchAndRenderHistory(timeframe) {
        try {
            let query = supabase.from('signals').select('*').order('created_at', { ascending: false });

            // Apply date filters if requested
            if (timeframe === 'week') {
                const pastWeek = new Date();
                pastWeek.setDate(pastWeek.getDate() - 7);
                query = query.gte('created_at', pastWeek.toISOString());
            } else if (timeframe === 'month') {
                const pastMonth = new Date();
                pastMonth.setMonth(pastMonth.getMonth() - 1);
                query = query.gte('created_at', pastMonth.toISOString());
            }

            const { data: signals, error } = await query;
            if (error) throw error;

            calculateMetrics(signals || []);
            renderTable(signals || []);
            renderCharts(signals || []);

        } catch (err) {
            console.error("Error building history metrics:", err.message);
        }
    }

    function calculateMetrics(signals) {
    const total = signals.length;

  // Replace the old wins/losses filter with this:
const wins = signals.filter(s => {
    if (!s.status) return false;
    return s.status.toLowerCase().includes('tp') || 
           s.status.toLowerCase().includes('won') || 
           s.status.toLowerCase().includes('take profit');
}).length;

const losses = signals.filter(s => {
    if (!s.status) return false;
    return s.status.toLowerCase().includes('lost') || 
           s.status.toLowerCase().includes('stop loss');
}).length;

    const winrate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;

    // Calculate Pips
    let netPips = 0;
    signals.forEach(s => {
        if (typeof calculatePips === 'function' && s.status) {
            const pips = calculatePips(s);
            const stat = s.status.toLowerCase();
            if (stat.includes('lost') || stat.includes('stop loss')) {
                netPips -= Math.abs(pips);
            } else if (stat.includes('tp') || stat.includes('won') || stat.includes('take profit')) {
                netPips += pips;
            }
        }
    });

    document.getElementById('stat-winrate').textContent = `${winrate}%`;
    document.getElementById('stat-win-count').textContent = `${wins} Wins / ${losses} Losses`;
    document.getElementById('stat-total-signals').textContent = total;
    document.getElementById('stat-avg-rr').textContent = "1:2.4"; 
    document.getElementById('stat-net-profit').textContent = `${netPips > 0 ? '+' : ''}${netPips} Pips`;
}


    function renderTable(signals) {
        const tableBody = document.getElementById('history-table-body');
        if (!tableBody) return;

        if (signals.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-muted" style="text-align:center;">No trade records found for this period.</td></tr>`;
            return;
        }

        tableBody.innerHTML = signals.map(s => {
       // Replace the old badge logic with this:
let badgeClass = "result-active";
let displayStatus = s.status || 'ACTIVE';

if (s.status) {
    const stat = s.status.toLowerCase();
    if (stat.includes('tp') || stat.includes('won') || stat.includes('take profit')) {
        badgeClass = "result-won";
    } else if (stat.includes('lost') || stat.includes('stop loss')) {
        badgeClass = "result-lost";
    }
}
let resultBadge = `<span class="badge-result ${badgeClass}">${displayStatus}</span>`;
        
            return `
                <tr>
                    <td>${dateStr}</td>
                    <td><strong>${s.pair}</strong></td>
                    <td style="color: ${s.direction === 'BUY' ? 'var(--win-green)' : 'var(--loss-red)'}">${s.direction}</td>
                    <td>${s.entry_price}</td>
                    <td>${s.stop_loss}</td>
                    <td>${s.take_profit_3 || s.take_profit_1}</td>
                    <td>${resultBadge}</td>
                    <td>1:2.5</td>
                </tr>
            `;
        }).join('');
    }

    function renderCharts(signals) {
            const wins = signals.filter(s => s.status && (s.status.toLowerCase().includes('tp') || s.status.toLowerCase().includes('won') || s.status.toLowerCase().includes('take profit'))).length;
    const losses = signals.filter(s => s.status && (s.status.toLowerCase().includes('lost') || s.status.toLowerCase().includes('stop loss'))).length;
    const active = signals.length - wins - losses;

        // 1. Outcome Pie Chart
        const pieCtx = document.getElementById('winratePieChart').getContext('2d');
        if (pieChartInstance) pieChartInstance.destroy();

        pieChartInstance = new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: ['Wins', 'Losses', 'Active'],
                datasets: [{
                    data: [wins || 1, losses || 0, active || 0],
                    backgroundColor: ['#00C853', '#FF3D00', '#D4AF37'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#fff' } } }
            }
        });

        // 2. Cumulative Equity Line Chart
        const lineCtx = document.getElementById('profitLineChart').getContext('2d');
        if (lineChartInstance) lineChartInstance.destroy();

        lineChartInstance = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: ['Trade 1', 'Trade 2', 'Trade 3', 'Trade 4', 'Trade 5'],
                datasets: [{
                    label: 'Equity Growth (Pips)',
                    data: [0, 45, 30, 75, 120],
                    borderColor: '#D4AF37',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
});
