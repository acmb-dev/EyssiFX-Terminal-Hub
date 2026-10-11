// --- P&L TRACKER SYSTEM ---

let currentDisplayDate = new Date(); // Tracks active calendar month/year/week
let activePnlFilter = 'month';     // 'week', 'month', 'year'

// Helper: Get storage keys based on logged-in user
function getPnlStorageKey() {
    const user = localStorage.getItem('current_user') || 'default_user';
    return `supreme_pnl_records_${user}`;
}

function getGoalStorageKey(periodKey) {
    const user = localStorage.getItem('current_user') || 'default_user';
    return `supreme_pnl_goal_${user}_${periodKey}`;
}

// Load all records
function loadPnlRecords() {
    try {
        return JSON.parse(localStorage.getItem(getPnlStorageKey())) || {};
    } catch (e) {
        return {};
    }
}

// Save records
function savePnlRecords(records) {
    localStorage.setItem(getPnlStorageKey(), JSON.stringify(records));
}

// Switch Filter Tabs (Week, Month, Year)
window.switchPnlFilter = function(filter) {
    activePnlFilter = filter;
    
    // Update tab button styles
    document.querySelectorAll('.pnl-tab').forEach(btn => {
        btn.style.background = '#1e222d';
        btn.style.color = '#a0aec0';
        btn.style.borderColor = '#363c4e';
    });
    
    event.target.style.background = '#131722';
    event.target.style.color = '#00C851';
    event.target.style.borderColor = '#00C851';

    renderPnlTracker();
};

// Change Navigation (Months or Years depending on filter)
window.changeMonth = function(direction) {
    if (activePnlFilter === 'year') {
        currentDisplayDate.setFullYear(currentDisplayDate.getFullYear() + direction);
    } else {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() + direction);
    }
    renderPnlTracker();
};

// Edit Goal (Weekly, Monthly, or Yearly)
window.editGoal = function(periodKey, periodName) {
    const currentGoal = localStorage.getItem(getGoalStorageKey(periodKey)) || '';

    Swal.fire({
        title: `Set ${periodName} Goal`,
        input: 'number',
        inputValue: currentGoal,
        inputPlaceholder: 'e.g. 1000',
        background: '#131722',
        color: '#ffffff',
        confirmButtonColor: '#d4af37',
        showCancelButton: true
    }).then((result) => {
        if (result.isConfirmed) {
            const val = parseFloat(result.value);
            if (!isNaN(val)) {
                localStorage.setItem(getGoalStorageKey(periodKey), val);
                renderPnlTracker();
            }
        }
    });
};

// Main Render Function for P&L Tracker
function renderPnlTracker() {
    const label = document.getElementById('pnl-month-year-label');
    const daysContainer = document.getElementById('pnl-calendar-days');
    const totalAmountEl = document.getElementById('pnl-total-amount');
    const goalTitleEl = document.querySelector('#pnl-goal-amount').previousElementSibling.querySelector('span');
    const goalAmountEl = document.getElementById('pnl-goal-amount');
    const goalProgressEl = document.getElementById('pnl-goal-progress');

    if (!daysContainer) return;

    const year = currentDisplayDate.getFullYear();
    const month = currentDisplayDate.getMonth();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const records = loadPnlRecords();

    let totalPnl = 0;
    let periodEarned = 0;
    let goalKey = '';
    let goalTitleText = '';

    // ==========================================
    // 1. YEARLY VIEW
    // ==========================================
    if (activePnlFilter === 'year') {
        if (label) label.innerText = `${year} Yearly Overview`;
        goalTitleText = 'Yearly goal';
        goalKey = `year_${year}`;

        // Calculate Yearly Total
        Object.keys(records).forEach(dateStr => {
            const recordDate = new Date(dateStr);
            if (recordDate.getFullYear() === year) {
                totalPnl += records[dateStr].pnl || 0;
            }
        });
        periodEarned = totalPnl;

        // Render 12 Months Grid
        daysContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
        daysContainer.innerHTML = '';

        monthNames.forEach((mName, mIdx) => {
            let monthPnl = 0;
            Object.keys(records).forEach(dateStr => {
                const rd = new Date(dateStr);
                if (rd.getFullYear() === year && rd.getMonth() === mIdx) {
                    monthPnl += records[dateStr].pnl || 0;
                }
            });

            const mCard = document.createElement('div');
            mCard.style.background = '#181c27';
            mCard.style.border = '1px solid #2a2e39';
            mCard.style.borderRadius = '8px';
            mCard.style.padding = '14px';
            mCard.style.textAlign = 'center';
            mCard.style.cursor = 'pointer';
            mCard.style.transition = 'border-color 0.2s';

            mCard.onmouseover = () => mCard.style.borderColor = '#d4af37';
            mCard.onmouseout = () => mCard.style.borderColor = '#2a2e39';
            
            // Clicking month jumps to month view
            mCard.onclick = () => {
                currentDisplayDate.setMonth(mIdx);
                activePnlFilter = 'month';
                document.querySelectorAll('.pnl-tab').forEach(b => {
                    b.style.background = '#1e222d';
                    b.style.color = '#a0aec0';
                    b.style.borderColor = '#363c4e';
                });
                // Highlight Month tab
                document.querySelectorAll('.pnl-tab')[1].style.background = '#131722';
                document.querySelectorAll('.pnl-tab')[1].style.color = '#00C851';
                document.querySelectorAll('.pnl-tab')[1].style.borderColor = '#00C851';
                renderPnlTracker();
            };

            const pnlColor = monthPnl >= 0 ? '#00C851' : '#ff4444';
            mCard.innerHTML = `
                <div style="font-size: 0.9rem; font-weight: bold; color: #fff; margin-bottom: 6px;">${mName}</div>
                <div style="font-size: 1rem; font-weight: bold; color: ${pnlColor};">${monthPnl >= 0 ? '+' : ''}$${monthPnl.toFixed(2)}</div>
            `;
            daysContainer.appendChild(mCard);
        });

    } 
    // ==========================================
    // 2. WEEKLY VIEW (Weeks 1 to 5 of Month)
    // ==========================================
    else if (activePnlFilter === 'week') {
        if (label) label.innerText = `${monthNames[month]} ${year} - Weekly Breakdown`;
        goalTitleText = 'Weekly goal';
        goalKey = `month_${year}_${month}_weekly`; // Or weekly aggregate

        // Calculate Month Total for Total P&L box
        Object.keys(records).forEach(dateStr => {
            const rd = new Date(dateStr);
            if (rd.getFullYear() === year && rd.getMonth() === month) {
                totalPnl += records[dateStr].pnl || 0;
            }
        });

        // Split month into weeks (Week 1, Week 2, Week 3, Week 4, Week 5)
        daysContainer.style.gridTemplateColumns = '1fr';
        daysContainer.innerHTML = '';

        const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
        let weeks = {};

        for (let day = 1; day <= totalDaysInMonth; day++) {
            const d = new Date(year, month, day);
            // Determine week number in month (1-based index)
            const weekNum = Math.ceil((day + new Date(year, month, 1).getDay() - 1) / 7);
            if (!weeks[weekNum]) weeks[weekNum] = [];
            weeks[weekNum].push({ day, dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` });
        }

        Object.keys(weeks).forEach(wNum => {
            let weekPnl = 0;
            weeks[wNum].forEach(item => {
                if (records[item.dateStr]) weekPnl += records[item.dateStr].pnl || 0;
            });

            const wCard = document.createElement('div');
            wCard.style.background = '#181c27';
            wCard.style.border = '1px solid #2a2e39';
            wCard.style.borderRadius = '8px';
            wCard.style.padding = '14px 20px';
            wCard.style.display = 'flex';
            wCard.style.justifyContent = 'space-between';
            wCard.style.alignItems = 'center';

            const wColor = weekPnl >= 0 ? '#00C851' : '#ff4444';
            wCard.innerHTML = `
                <div>
                    <div style="font-size: 1rem; font-weight: bold; color: #fff;">Week ${wNum} (${monthNames[month]} ${weeks[wNum][0].day} - ${weeks[wNum][weeks[wNum].length - 1].day})</div>
                    <div style="font-size: 0.75rem; color: #a0aec0; margin-top: 4px;">Days: ${weeks[wNum].length} recorded</div>
                </div>
                <div style="font-size: 1.2rem; font-weight: bold; color: ${wColor};">${weekPnl >= 0 ? '+' : ''}$${weekPnl.toFixed(2)}</div>
            `;
            daysContainer.appendChild(wCard);
        });
        periodEarned = totalPnl; // Or specific week if tracked

    } 
    // ==========================================
    // 3. MONTHLY VIEW (Default Calendar Grid)
    // ==========================================
    else {
        if (label) label.innerText = `${monthNames[month]} ${year}`;
        goalTitleText = 'Monthly goal';
        goalKey = `${year}-${String(month + 1).padStart(2, '0')}`;

        Object.keys(records).forEach(dateStr => {
            const rd = new Date(dateStr);
            if (rd.getFullYear() === year && rd.getMonth() === month) {
                totalPnl += records[dateStr].pnl || 0;
            }
        });
        periodEarned = totalPnl;

        daysContainer.style.gridTemplateColumns = 'repeat(7, 1fr)';
        daysContainer.innerHTML = '';

        const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
        const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDayIndex; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.style.aspectRatio = '1';
            daysContainer.appendChild(emptyDiv);
        }

        for (let day = 1; day <= totalDaysInMonth; day++) {
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayRecord = records[dateString];
            
            const dayCell = document.createElement('div');
            dayCell.style.aspectRatio = '1';
            dayCell.style.background = '#181c27';
            dayCell.style.border = '1px solid #2a2e39';
            dayCell.style.borderRadius = '8px';
            dayCell.style.padding = '8px';
            dayCell.style.display = 'flex';
            dayCell.style.flexDirection = 'column';
            dayCell.style.justifyContent = 'space-between';
            dayCell.style.cursor = 'pointer';
            dayCell.style.transition = 'border-color 0.2s';

            dayCell.onmouseover = () => dayCell.style.borderColor = '#d4af37';
            dayCell.onmouseout = () => dayCell.style.borderColor = '#2a2e39';

            let pnlText = '—';
            let pnlColor = '#a0aec0';

            if (dayRecord && dayRecord.pnl !== undefined) {
                const val = dayRecord.pnl;
                pnlText = `${val >= 0 ? '+' : ''}$${val}`;
                pnlColor = val >= 0 ? '#00C851' : '#ff4444';
                dayCell.style.background = val >= 0 ? 'rgba(0, 200, 81, 0.05)' : 'rgba(255, 68, 68, 0.05)';
            }

            // Clean look: Journal text is hidden on card, viewable only by clicking date!
            dayCell.innerHTML = `
                <div style="font-size: 0.8rem; color: #a0aec0; font-weight: bold;">${day}</div>
                <div style="font-size: 0.95rem; font-weight: bold; text-align: center; color: ${pnlColor};">${pnlText}</div>
                <div></div>
            `;

            dayCell.onclick = () => openDayEditor(dateString, dayRecord);
            daysContainer.appendChild(dayCell);
        }
    }

    // Display Total P&L
    totalAmountEl.innerText = `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`;
    totalAmountEl.style.color = totalPnl >= 0 ? '#00C851' : '#ff4444';

    // Update Goal Card & Progress Bar
    if (goalTitleEl) goalTitleEl.innerText = goalTitleText;
    
    // Attach onclick to goal edit pencil icon
    const editIcon = goalTitleEl.nextElementSibling;
    if (editIcon) editIcon.onclick = () => editGoal(goalKey, goalTitleText);

    const goalVal = parseFloat(localStorage.getItem(getGoalStorageKey(goalKey)));

    if (!isNaN(goalVal) && goalVal > 0) {
        const progressPct = Math.min(Math.max((periodEarned / goalVal) * 100, 0), 100);
        goalAmountEl.innerHTML = `$${goalVal.toFixed(2)} <span style="font-size: 0.75rem; color: #00C851; font-weight: normal;">(${periodEarned >= 0 ? '+' : ''}$${periodEarned.toFixed(2)} earned)</span>`;
        goalProgressEl.style.width = `${progressPct}%`;
        goalProgressEl.style.background = periodEarned >= 0 ? '#00C851' : '#ff4444';
    } else {
        goalAmountEl.innerHTML = `$0.00 <span style="font-size: 0.75rem; color: #a0aec0; font-weight: normal;">Not set yet</span>`;
        goalProgressEl.style.width = '0%';
    }
}

// Interactive Day Editor Modal (PnL + Journal Note)
function openDayEditor(dateStr, existingRecord) {
    const currentPnl = existingRecord && existingRecord.pnl !== undefined ? existingRecord.pnl : '';
    const currentNote = existingRecord && existingRecord.note ? existingRecord.note : '';

    Swal.fire({
        title: `P&L & Journal for ${dateStr}`,
        html: `
            <div style="text-align: left; margin-bottom: 12px;">
                <label style="color: #a0aec0; font-size: 0.85rem; display: block; margin-bottom: 4px;">Profit / Loss ($)</label>
                <input type="number" id="swal-pnl-val" class="swal2-input" placeholder="e.g. 150 or -50" value="${currentPnl}" style="margin: 0; width: 100%; box-sizing: border-box; background: #1e222d; color: #fff; border: 1px solid #363c4e;">
            </div>
            <div style="text-align: left;">
                <label style="color: #a0aec0; font-size: 0.85rem; display: block; margin-bottom: 4px;">Trading Journal Note</label>
                <textarea id="swal-pnl-note" class="swal2-textarea" placeholder="Why did you profit or lose today?" style="margin: 0; width: 100%; box-sizing: border-box; background: #1e222d; color: #fff; border: 1px solid #363c4e; height: 90px;">${currentNote}</textarea>
            </div>
        `,
        background: '#131722',
        color: '#ffffff',
        showCancelButton: true,
        confirmButtonText: 'Save Record',
        confirmButtonColor: '#d4af37',
        preConfirm: () => {
            const pnlInput = document.getElementById('swal-pnl-val').value;
            const noteInput = document.getElementById('swal-pnl-note').value;
            return {
                pnl: pnlInput === '' ? null : parseFloat(pnlInput),
                note: noteInput.trim()
            };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const records = loadPnlRecords();
            if (result.value.pnl === null && result.value.note === '') {
                delete records[dateStr];
            } else {
                records[dateStr] = {
                    pnl: result.value.pnl || 0,
                    note: result.value.note
                };
            }
            savePnlRecords(records);
            renderPnlTracker();
        }
    });
}

// Global Dashboard Tab Switcher & P&L Initialization
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            const target = this.getAttribute('data-target');
            if (!target) return;

            e.preventDefault();

            const allSectionIds = ['dashboard', 'signal', 'chart-analysis', 'fundamentals', 'history', 'pnl'];
            allSectionIds.forEach(secId => {
                const sec = document.getElementById(secId);
                if (sec) sec.style.display = 'none';
            });

            document.querySelectorAll('.content-section').forEach(sec => {
                sec.style.display = 'none';
            });

            const targetSection = document.getElementById(target);
            if (targetSection) {
                targetSection.style.display = 'block';
            }

            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            if (target === 'pnl') {
                renderPnlTracker();
            }
        });
    });
});