// Storage Key
const STORAGE_KEY = 'supreme_fx_signals_v1';

// --- DISCORD WEBHOOK SETUP ---
const DISCORD_WEBHOOK_URL = "https://discord.com/";

async function sendToDiscord(message) {
    try {
        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: message })
        });
    } catch (error) { 
        console.error("Discord error:", error); 
    }
}

// --- TELEGRAM BROADCAST FUNCTION ---
async function sendSignalToTelegram(signalData) {
    const BOT_TOKEN = '8915883967:AAFSliptsfkKeQMqOM_AYIgNOG_vvNRitM';
    const CHAT_ID = '-1004483435065'; // e.g. "-1001234567890"
    const TOPIC_ID = 3; // Replace with your Topic ID

    let message = `🔥 <b>TRADE BARR LIVE SIGNAL</b> 🔥\n\n`;
    message += `<b>Pair:</b> ${signalData.pair}\n`;
    message += `<b>Direction:</b> ${signalData.direction}\n`;
    message += `<b>Entry Area:</b> <code>${signalData.entry}</code>\n`;
    message += `<b>Stop Loss (SL):</b> <code>${signalData.sl}</code>\n\n`;
    
    message += `🎯 <b>TP1:</b> <code>${signalData.tp1}</code>\n`;
    if (signalData.tp2) message += `🎯 <b>TP2:</b> <code>${signalData.tp2}</code>\n`;
    if (signalData.tp3) message += `🎯 <b>TP3:</b> <code>${signalData.tp3}</code>\n`;
    if (signalData.tp4) message += `🎯 <b>TP4:</b> <code>${signalData.tp4}</code>\n`;
    if (signalData.tp5) message += `🎯 <b>TP5:</b> <code>${signalData.tp5}</code>\n`
    if (signalData.tp6) message += `🎯 <b>TP6:</b> <code>${signalData.tp6}</code>\n`
    if (signalData.tp7) message += `🎯 <b>TP7:</b> <code>${signalData.tp7}</code>\n`
    if (signalData.tp8) message += `🎯 <b>TP8:</b> <code>${signalData.tp8}</code>\n`
    
    message += `\n📊 <b>Est. R:R:</b> 1:${signalData.rr}`;

    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                message_thread_id: TOPIC_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });

        const resData = await response.json();
        if (resData.ok) {
            console.log("✈️ Signal successfully sent to Telegram Topic!");
        } else {
            console.error("Telegram API Error:", resData.description);
        }
    } catch (error) {
        console.error("Failed to connect to Telegram API:", error);
    }
}
// --- TELEGRAM STATUS UPDATE FUNCTION ---
async function sendStatusUpdateToTelegram(textMessage) {
    // ⚠️ USE THE EXACT SAME CREDENTIALS AS YOUR OTHER FUNCTION
    const BOT_TOKEN = '8915883967:AAFSliptsfkKeQMqOM_AYIgNOG_vvNRitM';
    const CHAT_ID = '-1004483435065'; 
    const TOPIC_ID = 3; 

    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST'
            ,headers:{ 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                message_thread_id: TOPIC_ID,
                text: `<b>TRADE BARR UPDATE:</b>\n${textMessage}`,
                parse_mode: 'HTML'
            })
        });
    } catch (error) {
        console.error("Telegram Status Update Error:", error);
    }
}

// -----------------------------
// 1. Helper: Get Current Philippine Time (PHT)
function getPHTFormattedDate() {
    const options = {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    return new Intl.DateTimeFormat('en-US', options).format(new Date()) + ' PHT';
}

// 2. Storage Helpers
function getStoredSignals() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveSignals(signals) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(signals));
    renderAll();
}

// 3. Calculation Helpers
function calculateRR(entry, sl, tp) {
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    if (risk === 0) return '1:0.0';
    return `1:${(reward / risk).toFixed(1)}`;
}

function calculatePips(signal) {
    const entry = parseFloat(signal.entry);
    const sl = parseFloat(signal.sl);
    const tp1 = parseFloat(signal.tp1);
    const tp8 = signal.tp8 ? parseFloat(signal.tp8) : tp1;
    const isBuy = signal.direction === 'BUY';

    let diff = 0;
    if (signal.status.includes('TP Hit') || /TP[1-8] Hit/.test(signal.status)) {
        // Automatically determine which exact TP level was hit
        const tpLevel = signal.status.match(/TP([1-8])/);
        let target = tp8; // Default
        
        if (tpLevel) {
            if (tpLevel[1] === '1') target = tp1;
            if (tpLevel[1] === '2') target = signal.tp2 ? parseFloat(signal.tp2) : tp1;
            if (tpLevel[1] === '3') target = signal.tp3 ? parseFloat(signal.tp3) : tp1;
            if (tpLevel[1] === '4') target = signal.tp4 ? parseFloat(signal.tp4) : tp1;
            if (tpLevel[1] === '5') target = signal.tp5 ? parseFloat(signal.tp5) : tp1;
            if (tpLevel[1] === '6') target = signal.tp6 ? parseFloat(signal.tp6) : tp1;
            if (tpLevel[1] === '7') target = signal.tp7 ? parseFloat(signal.tp7) : tp1;
            if (tpLevel[1] === '8') target = tp8;
        }
        diff = isBuy ? (target - entry) : (entry - target);
        
    } else if (signal.status.includes('Early TP')) {
        // Extract your custom exit price from the text (e.g., "Early TP @ 4250.50")
        const matchedPrice = signal.status.match(/@\s*([0-9.]+)/);
        const exitPrice = matchedPrice ? parseFloat(matchedPrice[1]) : entry;
        diff = isBuy ? (exitPrice - entry) : (entry - exitPrice);
        
    } else if (signal.status === 'Stop Loss Hit') {
        diff = isBuy ? (sl - entry) : (entry - sl);
        
    } else {
        return 0; // Active or Disregarded
    }


    const multiplier = signal.pair === 'XAUUSD' ? 10 : 1;
    return Math.round(diff * multiplier);
}

// --- SYNC AI ANALYSIS TO LIVE SIGNAL FORM (SUPPORT FOR ENTRY AREAS) ---
window.syncAnalysisToLiveSignal = function(direction, entry, sl, masterTp) {
    const rawEntry = String(entry).trim();
    
    // Extract the primary price for calculations (takes the number before the dash)
    const entryPrice = parseFloat(rawEntry.split('-')[0].trim());
    const stopLoss = parseFloat(String(sl).replace(/[^0-9.]/g, ''));
    const takeProfit = parseFloat(String(masterTp).replace(/[^0-9.]/g, ''));

    if (isNaN(entryPrice) || isNaN(stopLoss) || isNaN(takeProfit)) {
        console.warn("Sync Notice: Could not parse price numbers for calculation.", { entry, sl, masterTp });
        return;
    }

    // Calculate TP levels based on primary entry price
    const tpDistance = takeProfit - entryPrice;
    const tp1 = entryPrice + (tpDistance * 0.13);
    const tp2 = entryPrice + (tpDistance * 0.25);
    const tp3 = entryPrice + (tpDistance * 0.38);
    const tp4 = entryPrice + (tpDistance * 0.50);
    const tp5 = entryPrice + (tpDistance * 0.63);
    const tp6 = entryPrice + (tpDistance * 0.75);
    const tp7 = entryPrice + (tpDistance * 0.88);
    const tp8 = takeProfit;

    // Helper function to assign values to input fields
    const setInputValue = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    // Update Dropdowns
    const dirEl = document.getElementById('sig-direction');
    if (dirEl) dirEl.value = (direction || 'BUY').toUpperCase();

    const pairEl = document.getElementById('sig-pair');
    if (pairEl) pairEl.value = 'XAUUSD';

    // Inject Values (Keeps full text range in sig-entry)
    setInputValue('sig-entry', rawEntry);
    setInputValue('sig-sl', stopLoss.toFixed(2));
    setInputValue('sig-tp1', tp1.toFixed(2));
    setInputValue('sig-tp2', tp2.toFixed(2));
    setInputValue('sig-tp3', tp3.toFixed(2));
    setInputValue('sig-tp4', tp4.toFixed(2));
    setInputValue('sig-tp5', tp5.toFixed(2));
    setInputValue('sig-tp6', tp6.toFixed(2));
    setInputValue('sig-tp7', tp7.toFixed(2));
    setInputValue('sig-tp8', tp8.toFixed(2));
};

// 4. Global Broadcast Function (Called by button onclick)
window.broadcastSignal = function() {
    const entryInput = document.getElementById('sig-entry');
    const slInput = document.getElementById('sig-sl');
    const tp1Input = document.getElementById('sig-tp1');

    // REPLACE LINES 139-142 WITH THIS:
if (!entryInput || !slInput || !tp1Input || !entryInput.value.trim() || !slInput.value.trim() || !tp1Input.value.trim()) {
    alert("Please fill in at least Entry Price, Stop Loss, and TP1.");
    return;
}

        const entryDisplay = entryInput.value.trim();
    const entryCalc = parseFloat(entryInput.value.split('-')[0].trim());
    const sl = parseFloat(slInput.value);
    const tp1 = parseFloat(tp1Input.value);

    const tp2Val = document.getElementById('sig-tp2')?.value;
    const tp3Val = document.getElementById('sig-tp3')?.value;
    const tp4Val = document.getElementById('sig-tp4')?.value;
    const tp5Val = document.getElementById('sig-tp5')?.value;
    const tp6Val = document.getElementById('sig-tp6')?.value;
    const tp7Val = document.getElementById('sig-tp7')?.value;
    const tp8Val = document.getElementById('sig-tp8')?.value;

    const tp2 = tp2Val ? parseFloat(tp2Val) : null;
    const tp3 = tp3Val ? parseFloat(tp3Val) : null;
    const tp4 = tp4Val ? parseFloat(tp4Val) : null;
    const tp5 = tp5Val ? parseFloat(tp5Val) : null;
    const tp6 = tp6Val ? parseFloat(tp6Val) : null;
    const tp7 = tp7Val ? parseFloat(tp7Val) : null;
    const tp8 = tp8Val ? parseFloat(tp8Val) : null;

    const newSignal = {
        id: Date.now(),
        date: getPHTFormattedDate(),
        pair: document.getElementById('sig-pair').value,
        direction: document.getElementById('sig-direction').value,
        entry: entryDisplay,
        sl: sl,
        tp1: tp1,
        tp2: tp2,
        tp3: tp3,
        tp4: tp4,
        tp5: tp5,
        tp6: tp6,
        tp7: tp7,
        tp8: tp8,
        rr: calculateRR(entryCalc, sl, tp8 || tp1),
        status: 'Active'
    };

    const signals = getStoredSignals();
    signals.unshift(newSignal);
    saveSignals(signals);

     // --- SEND TO TELEGRAM ---
    sendSignalToTelegram(newSignal)
    // --- SEND TO DISCORD ---
    const signalMessage = `
**TRADE BARR**
**Pair:** ${newSignal.pair}
**Direction:** ${newSignal.direction}
**Price:** ${newSignal.entry}
**Stop Loss:** ${newSignal.sl}
**Take Profit 1:** ${newSignal.tp1}
**Take Profit 2:** ${newSignal.tp2 || 'N/A'}
**Take Profit 3:** ${newSignal.tp3 || 'N/A'}
**Take Profit 4:** ${newSignal.tp4 || 'N/A'}
**Take Profit 5:** ${newSignal.tp5 || 'N/A'}
**Take Profit 6:** ${newSignal.tp6 || 'N/A'}
**Take Profit 7:** ${newSignal.tp7 || 'N/A'}
**Take Profit 8:** ${newSignal.tp8 || 'N/A'}

*The entry price is the area where we monitor whether the market respects the designated zone. If the market does not respect the designated area, DO NOT ENTER!*

*ALWAYS ANALYZE AND MONITOR FIRST THE SIGNAL! GOODLUCK SUPREMES! @everyone*`;

    sendToDiscord(signalMessage);
    // -----------------------

    // Reset Form Safely
    const form = document.getElementById('signal-form');
    if (form) form.reset();
};

// --- UPDATED STATUS HANDLER ---
window.updateSignalStatus = async function(id, newStatus) {
    let finalStatus = newStatus;

    // 1. Beautiful Dark Theme Popup for Early TP
    if (newStatus === 'Early Take Profit') {
        const { value: price } = await Swal.fire({
            title: 'Early Take Profit',
            text: 'Enter the exact close price:',
            input: 'text',
            background: '#131722', // Matches your dashboard dark background
            color: '#ffffff',
            confirmButtonColor: '#d4af37', // SupremeFX Gold
            showCancelButton: true
        });
        
        if (!price) return; // User canceled
        finalStatus = `Early TP @ ${price.trim()}`;
    } 
    
    // 2. Beautiful Dropdown Popup for TP Hit
    else if (newStatus === 'Take Profit Hit') {
        const { value: tpLevel } = await Swal.fire({
            title: 'Take Profit Hit',
            text: 'Which TP was reached?',
            input: 'select',
            inputOptions: {
                '1': 'TP 1',
                '2': 'TP 2',
                '3': 'TP 3',
                '4': 'TP 4',
                '5': 'TP 5',
                '6': 'TP 6',
                '7': 'TP 7',
                '8': 'TP 8'
            },
            background: '#131722',
            color: '#ffffff',
            confirmButtonColor: '#d4af37',
            showCancelButton: true
        });
        
        if (!tpLevel) return; // User canceled
        finalStatus = `TP${tpLevel} Hit`;
    }
    
    //Save and Refresh UI
    const signals = getStoredSignals();
    const index = signals.findIndex(s => s.id === id);
    if (index !==-1) {
    signals[index].status = finalStatus;
    saveSignals(signals);
    renderLiveSignals();

// --- SEND FULL SIGNAL STATUS UPDATE TO DISCORD & TELEGRAM ---
        const sig = signals[index];

        // 1. Detect TP levels reached and assign flame emoji 🔥 to hit TPs
        const tpNum = finalStatus.includes('TP1') ? 1 :
                      finalStatus.includes('TP2') ? 2 :
                      finalStatus.includes('TP3') ? 3 :
                      finalStatus.includes('TP4') ? 4 :
                      finalStatus.includes('TP5') ? 5 :
                      finalStatus.includes('TP6') ? 6 :
                      finalStatus.includes('TP7') ? 7 :
                      finalStatus.includes('TP8') ? 8 : 0;

        const tp1Flame = tpNum >= 1 ? ' 🔥' : '';
        const tp2Flame = tpNum >= 2 ? ' 🔥' : '';
        const tp3Flame = tpNum >= 3 ? ' 🔥' : '';
        const tp4Flame = tpNum >= 4 ? ' 🔥' : '';
        const tp5Flame = tpNum >= 5 ? ' 🔥' : ''
        const tp6Flame = tpNum >= 6 ? ' 🔥' : ''
        const tp7Flame = tpNum >= 7 ? ' 🔥' : ''
        const tp8Flame = tpNum >= 8 ? ' 🔥' : ''

        // 2. Format status footer below Est. R:R for Stop Loss / Disregarded / Early TP
        let statusFooter = '';
        if (finalStatus === 'Stop Loss Hit') {
            statusFooter = '\n<b>❌ STOP LOSS HIT! WAIT FOR ANOTHER SIGNAL!</b>';
        } else if (finalStatus === 'Disregarded') {
            statusFooter = '\n<b>❌ THE SIGNAL IS DISREGARDED! WAIT FOR ANOTHER SIGNAL!</b>';
        } else if (finalStatus.includes('Early TP')) {
            statusFooter = `\n<b>🎯🔥 ${finalStatus}</b>`;
        }

        // 3. Construct the updated full signal layout
        const updatedSignalMessage = `🔥 <b>TRADE BARR SIGNAL UPDATE</b> 🔥\n\n` +
`<b>Pair:</b> ${sig.pair}\n` +
`<b>Direction:</b> ${sig.direction}\n` +
`<b>Entry Area:</b> <code>${sig.entry}</code>\n` +
`<b>Stop Loss (SL):</b> <code>${sig.sl}</code>\n\n` +
`🎯<b>TP1:</b> <code>${sig.tp1}</code>${tp1Flame}\n` +
`🎯<b>TP2:</b> <code>${sig.tp2}</code>${tp2Flame}\n` +
`🎯<b>TP3:</b> <code>${sig.tp3}</code>${tp3Flame}\n` +
`🎯<b>TP4:</b> <code>${sig.tp4}</code>${tp4Flame}\n` +
`🎯<b>TP5:</b> <code>${sig.tp5}</code>${tp5Flame}\n` +
`🎯<b>TP6:</b> <code>${sig.tp6}</code>${tp6Flame}\n` +
`🎯<b>TP7:</b> <code>${sig.tp7}</code>${tp7Flame}\n` +
`🎯<b>TP8:</b> <code>${sig.tp8}</code>${tp8Flame}\n\n` +
`📊 <b>Est. R:R:</b> ${sig.rr || sig.estRr || '1:1'}${statusFooter}`;

        // 4. Dispatch to connected Webhooks/APIs
        if (typeof sendToDiscord === 'function') {
            sendToDiscord(updatedSignalMessage.replace(/<[^>]*>/g, '')); // Strips HTML tags for Discord
        }
        if (typeof sendStatusUpdateToTelegram === 'function') {
            sendStatusUpdateToTelegram(updatedSignalMessage);
        }
    }
};

window.deleteSignal = function(id) {
    let signals = getStoredSignals();
    signals = signals.filter(s => s.id !== id);
    saveSignals(signals);
};

// 6. UI Renderers
function renderLiveSignals() {
    const container = document.getElementById('live-signals-list');
    if (!container) return;

    const signals = getStoredSignals();
    if (signals.length === 0) {
        container.innerHTML = `<p style="color: #718096; text-align: center; padding: 2rem;">No live signals broadcasted yet.</p>`;
        return;
    }

    container.innerHTML = signals.map(sig => {
        const pips = calculatePips(sig);
        const dirColor = sig.direction === 'BUY' ? '#00C851' : '#ff4444';
            const isTPHit = sig.status.includes('TP Hit') || /TP[1-8] Hit/.test(sig.status);
    const isEarlyTP = sig.status.includes('Early TP');

        return `
        <div style="background: #131722; border: 1px solid #2a2e39; border-left: 4px solid ${dirColor}; border-radius: 8px; padding: 1.2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div>
                    <span style="background: rgba(255,255,255,0.1); padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; color: #D4AF37; font-weight: bold; margin-right: 8px;">${sig.pair}</span>
                    <strong style="color: ${dirColor}; font-size: 0.95rem;">${sig.direction}</strong>
                    <span style="color: #718096; font-size: 0.75rem; margin-left: 10px;">${sig.date}</span>
                </div>
                <div style="font-family: monospace; font-weight: bold; color: ${pips >= 0 ? '#00C851' : '#ff4444'};">
                    Est R:R: ${sig.rr} | Profit: ${pips > 0 ? '+' : ''}${pips} Pips
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; font-family: monospace; font-size: 0.8rem; margin-bottom: 12px;">
                <span>ENTRY: <strong style="color:#fff;">${sig.entry}</strong></span>
                <span>SL: <strong style="color:#ff4444;">${sig.sl}</strong></span>
                <span>TP1: <strong style="color:#00C851;">${sig.tp1}</strong></span>
                ${sig.tp2 ? `<span>TP2: <strong style="color:#00C851;">${sig.tp2}</strong></span>` : ''}
                ${sig.tp3 ? `<span>TP3: <strong style="color:#00C851;">${sig.tp3}</strong></span>` : ''}
                ${sig.tp4 ? `<span>TP4: <strong style="color:#00C851;">${sig.tp4}</strong></span>` : ''}
                ${sig.tp5 ? `<span>TP5: <strong style="color:#00C851;">${sig.tp5}</strong></span>` : ''}
                ${sig.tp6 ? `<span>TP6: <strong style="color:#00C851;">${sig.tp6}</strong></span>` : ''}
                ${sig.tp7 ? `<span>TP7: <strong style="color:#00C851;">${sig.tp7}</strong></span>` : ''}
                ${sig.tp8 ? `<span>TP8: <strong style="color:#00C851;">${sig.tp8}</strong></span>` : ''}
            </div>

            <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
                <span style="color: #a0aec0; font-size: 0.75rem; margin-right: 6px;">Set Status:</span>
${['Active', 'Take Profit Hit', 'Early Take Profit', 'Stop Loss Hit', 'Disregarded'].map(st => {
    // 1. Check if the current button should be active
    let isBtnActive = false;
    
    // Highlight "Take Profit Hit" if the status has "TP" (like TP1 Hit) but isn't an early close
    if (st === 'Take Profit Hit' && sig.status.includes('TP') && !sig.status.includes('Early')) {
        isBtnActive = true;
    } 
    // Highlight "Early Take Profit" if the status contains our dynamic prompt string
    else if (st === 'Early Take Profit' && sig.status.includes('Early TP')) {
        isBtnActive = true;
    } 
    // Highlight standard buttons (Active, Stop Loss, Disregarded)
    else if (sig.status === st) {
        isBtnActive = true;
    }

    // 2. Render the button with the correct gold or gray color
    return `<button onclick="updateSignalStatus(${sig.id}, '${st}')" 
        style="background: ${isBtnActive ? '#D4AF37' : '#1e222d'}; color: ${isBtnActive ? '#000' : '#a0aec0'}; border: 1px solid #363c4e; padding: 4px 10px; border-radius: 4px; font-size: 0.72rem; cursor: pointer; font-weight: 600;">
        ${st}
    </button>`;
}).join('')}

                <button onclick="deleteSignal(${sig.id})" style="background: rgba(255,68,68,0.1); color: #ff4444; border: 1px solid rgba(255,68,68,0.3); padding: 4px 10px; border-radius: 4px; font-size: 0.72rem; cursor: pointer; margin-left: auto;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>`;
    }).join('');
}

let profitChartInstance = null;

function renderWinrateAndHistory() {
    const signals = getStoredSignals();
    
        const wins = signals.filter(s => {
        if (!s.status) return false;
        const stat = s.status.toLowerCase();
        return stat.includes('tp') || stat.includes('won') || stat.includes('take profit');
    });

    const losses = signals.filter(s => {
        if (!s.status) return false;
        const stat = s.status.toLowerCase();
        return stat.includes('lost') || stat.includes('stop loss');
    });

    const closedSignals = [...wins, ...losses];

    const totalClosed = closedSignals.length;
    const winrate = totalClosed > 0 ? ((wins.length / totalClosed) * 100).toFixed(1) : '0.0';
    const netPips = closedSignals.reduce((sum, s) => sum + calculatePips(s), 0);

    let avgRRVal = '1:0.0';
    if (totalClosed > 0) {
        const totalRRRatio = closedSignals.reduce((acc, s) => {
            const parts = s.rr.split(':');
            return acc + (parseFloat(parts[1]) || 0);
        }, 0);
        avgRRVal = `1:${(totalRRRatio / totalClosed).toFixed(1)}`;
    }

    const elWinrate = document.getElementById('stat-winrate');
    if (elWinrate) elWinrate.textContent = `${winrate}%`;

    const elWinLossCount = document.getElementById('stat-win-loss-count');
    if (elWinLossCount) elWinLossCount.textContent = `${wins.length} Wins / ${losses.length} Losses`;

    const elTotalSignals = document.getElementById('stat-total-signals');
    if (elTotalSignals) elTotalSignals.textContent = signals.length;

    const elAvgRR = document.getElementById('stat-avg-rr');
    if (elAvgRR) elAvgRR.textContent = avgRRVal;

    const elNetProfit = document.getElementById('stat-net-profit');
    if (elNetProfit) elNetProfit.textContent = `${netPips > 0 ? '+' : ''}${netPips}`;

    const execLogTable = document.getElementById('execution-log-tbody');
    if (execLogTable) {
        execLogTable.innerHTML = signals.map(sig => {
            const isWin = ['Take Profit Hit', 'Early Take Profit'].includes(sig.status);
            const isLoss = sig.status === 'Stop Loss Hit';
            
            let statusBadge = `<span style="color: #718096;">⚪ ${sig.status}</span>`;
            if (isWin) statusBadge = `<span style="color: #00C851; font-weight: bold;">🟢 ${sig.status}</span>`;
            if (isLoss) statusBadge = `<span style="color: #ff4444; font-weight: bold;">🔴 ${sig.status}</span>`;

            return `
            <tr style="border-bottom: 1px solid #2a2e39; font-size: 0.8rem; text-align: left;">
                <td style="padding: 10px; color: #a0aec0;">${sig.date}</td>
                <td style="padding: 10px; font-weight: bold; color: #D4AF37;">${sig.pair}</td>
                <td style="padding: 10px; color: ${sig.direction === 'BUY' ? '#00C851' : '#ff4444'}; font-weight: bold;">${sig.direction}</td>
                <td style="padding: 10px; font-family: monospace;">${sig.entry}</td>
                <td style="padding: 10px; font-family: monospace; color: #ff4444;">${sig.sl}</td>
                <td style="padding: 10px; font-family: monospace; color: #00C851;">${sig.tp8 || sig.tp1}</td>
                <td style="padding: 10px;">${statusBadge}</td>
                <td style="padding: 10px; font-family: monospace;">${sig.rr}</td>
            </tr>`;
        }).join('');
    }

    renderProfitCurveChart(closedSignals);
}

function renderProfitCurveChart(closedSignals) {
    const canvas = document.getElementById('profitCurveChart');
    if (!canvas || typeof Chart === 'undefined') return;

    let runningProfit = 0;
    const labels = ['Start'];
    const dataPoints = [0];

    [...closedSignals].reverse().forEach((sig, idx) => {
        runningProfit += calculatePips(sig);
        labels.push(`Trade ${idx + 1}`);
        dataPoints.push(runningProfit);
    });

    if (profitChartInstance) profitChartInstance.destroy();

    profitChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cumulative Net Profit (Pips)',
                data: dataPoints,
                borderColor: '#D4AF37',
                backgroundColor: 'rgba(212, 175, 55, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: '#2a2e39' }, ticks: { color: '#a0aec0' } },
                y: { grid: { color: '#2a2e39' }, ticks: { color: '#a0aec0' } }
            },
            plugins: { legend: { labels: { color: '#fff' } } }
        }
    });
}

// Master Render Function
function renderAll() {
    renderLiveSignals();
    renderWinrateAndHistory();
}

// Auto-run on Page Load
document.addEventListener('DOMContentLoaded', renderAll);
