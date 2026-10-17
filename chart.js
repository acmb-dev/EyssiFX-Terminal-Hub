let tvWidget = null;
let currentSymbol = "OANDA:XAUUSD";

document.addEventListener("DOMContentLoaded", () => {
        // Load saved chart insights instantly on page load
    const savedBuy = localStorage.getItem('saved_buy_insight');
    const savedSell = localStorage.getItem('saved_sell_insight');
    
    if (savedBuy) {
        const buyEl = document.getElementById('buy-insight-text');
        if (buyEl) buyEl.textContent = savedBuy;
    }
    if (savedSell) {
        const sellEl = document.getElementById('sell-insight-text');
        if (sellEl) sellEl.textContent = savedSell;
    }

    // Initialize chart on load
    initTradingView(currentSymbol);

    // Handle Asset Switching
    const assetButtons = document.querySelectorAll('.btn-asset');

    assetButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const clickedBtn = e.currentTarget;
            const newSymbol = clickedBtn.getAttribute('data-symbol');

            if (!newSymbol) return;

            // 1. Clear highlight from all buttons and active state on clicked button
            assetButtons.forEach(b => b.classList.remove('active'));
            clickedBtn.classList.add('active');

            // 2. Update currentSymbol and reload TradingView chart
            if (newSymbol !== currentSymbol) {
                currentSymbol = newSymbol;
                initTradingView(currentSymbol);
                
                // Dispatch event for external listeners
                window.dispatchEvent(new CustomEvent('symbolChanged', { detail: { symbol: currentSymbol } }));
            }
        });
    });
});

function initTradingView(symbol) {
    // Clear container to prevent duplicate widgets
    const container = document.getElementById('tv_chart_widget');
    container.innerHTML = ""; 

    tvWidget = new TradingView.widget({
        "autosize": true,
        "symbol": symbol,
        "interval": "15", // 15 Minute timeframe default
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1", // 1 = Candles
        "locale": "en",
        "enable_publishing": false,
        "backgroundColor": "#0D0D0D", // Matches panel-bg
        "gridColor": "rgba(255, 255, 255, 0.05)",
        "hide_top_toolbar": false,
        "hide_legend": false,
        "save_image": false,
        "container_id": "tv_chart_widget",
        "studies": [
            "Volume@tv-basicstudies",
            "MASimple@tv-basicstudies"
        ],
        "disabled_features": [
            "header_symbol_search",
            "header_compare"
        ]
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const btnChartSync = document.getElementById('btn-chart-sync');
    
        // Check for saved data and load it instantly
    const savedBuy = localStorage.getItem('saved_buy_insight');
    const savedSell = localStorage.getItem('saved_sell_insight');
    
    if (savedBuy) {
        document.getElementById('buy-insight-text').textContent = savedBuy;
    }
    if (savedSell) {
        document.getElementById('sell-insight-text').textContent = savedSell;
    }

    if(btnChartSync) {
        btnChartSync.addEventListener('click', async () => {
            // Retrieve the key they pasted on the Fundamental News page
            const savedKey = localStorage.getItem('supreme_gemini_key');
            
            if (!savedKey) {
                alert("Please go to the Fundamental Analysis section and connect your Google Gemini API key first.");
                return;
            }

            // Trigger UI Loading state
            btnChartSync.innerHTML = `<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> Analyzing Chart...`;
            document.getElementById('buy-insight-text').textContent = "Scanning 5-minute timeframe data...";
            document.getElementById('sell-insight-text').textContent = "Scanning 5-minute timeframe data...";

            try {
    // Detect whether current symbol is Dow Jones or Gold
            // Inverted check: If symbol does NOT contain XAU/GOLD, treat it as Dow Jones / US30
        const sym = currentSymbol.toUpperCase();
        const isGold = sym.includes('XAU') || sym.includes('GOLD');
        const activeAssetName = isGold ? 'XAU/USD (Gold)' : 'DJ30 / US30 (Dow Jones Index)';

        // Dynamic prompt using activeAssetName
        const promptText = `You are an expert institutional technical analyst.
Provide a complete Smart Money Concepts (SMC) and technical analysis for a trader scalping ${activeAssetName} on a 5-minute timeframe. 
Return strictly a JSON object formatted exactly like this, with no markdown, no code blocks, and no extra text:
{
  "marketBias": "2-4 Words",
  "confidenceScore": "1-3 Words",
  "smcStructure": "8-10 sentences analyzing ${activeAssetName} market structure, BOS/CHoCH Fair Value Gaps (FVG), and order blocks.",
  "buyInsight": "1-2 concise sentences explaining specific support levels or buy entries for ${activeAssetName}.",
  "sellInsight": "1-2 concise sentences explaining specific resistance levels or sell entries for ${activeAssetName}."
}`;

                // Fetching from Google's updated 3.6-flash endpoint
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${savedKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: promptText }] }],
                        generationConfig: { responseMimeType: "application/json" }
                    })
                });

                const rawData = await response.json();

                if (!response.ok) {
                    throw new Error(rawData.error?.message || "Google Gemini API Request Failed");
                }

// Parse and inject the data safely
let aiText = rawData.candidates[0].content.parts[0].text;
// Force strip any markdown backticks Gemini might have snuck in
aiText = aiText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        // Parse Gemini JSON response
        const aiData = JSON.parse(responseText);

        // Update Dashboard Elements
        if (aiData.marketBias) document.getElementById('market-bias').textContent = aiData.marketBias;
        if (aiData.confidenceScore) document.getElementById('confidence-score').textContent = aiData.confidenceScore;
        if (aiData.smcStructure) document.getElementById('smc-structure-text').textContent = aiData.smcStructure;
        if (aiData.buyInsight) document.getElementById('buy-insight-text').textContent = aiData.buyInsight;
        if (aiData.sellInsight) document.getElementById('sell-insight-text').textContent = aiData.sellInsight;

                document.getElementById('buy-insight-text').textContent = aiData.buyInsight;
                document.getElementById('sell-insight-text').textContent = aiData.sellInsight;

        // Save the results to local storage permanently
        localStorage.setItem('saved_buy_insight', aiData.buyInsight);
        localStorage.setItem('saved_sell_insight', aiData.sellInsight);

    // --- SYNC TO LIVE SIGNAL FORM ---
    if (aiData.recommendedDirection && aiData.entry && aiData.sl && aiData.tp) {
        if (typeof window.syncAnalysisToLiveSignal === 'function') {
            window.syncAnalysisToLiveSignal(
                aiData.recommendedDirection,
                aiData.entry,
                aiData.sl,
                aiData.tp
            );
            alert(`🔥 AI Setup Synced! Check the Live Signal Form.`);
        } else {
            alert("Error: The sync function in signal.js isn't loading properly.");
        }
    } else {
        alert("The AI generated the insight, but forgot to include the Entry/SL/TP numbers. Try syncing again.");
        console.log("Missing data from AI:", aiData);
    }
    // --------------------------------


            } catch (error) {
                console.error("Chart Sync Error:", error);
                document.getElementById('buy-insight-text').textContent = `Connection Error: ${error.message}`;
                document.getElementById('sell-insight-text').textContent = `Connection Error: ${error.message}`;
            } finally {
                // Restore button state
                btnChartSync.innerHTML = `<i class="fas fa-check" style="margin-right: 8px;"></i> Insights Updated`;
                
                setTimeout(() => {
                    btnChartSync.innerHTML = `<i class="fas fa-robot" style="margin-right: 8px;"></i> Sync Live Chart Insight`;
                }, 3000);
            }
        });
    }
});

// --- BITCOIN (BTC) CHART & AI ANALYSIS LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    const btcNavBtn = document.querySelector('[data-target="btc-chart"]');
    if (btcNavBtn) {
        btcNavBtn.addEventListener('click', () => {
            initBtcTradingView();
        });
    }

    const btcSyncBtn = document.getElementById('btc-btn-chart-sync');
    if (btcSyncBtn) {
        btcSyncBtn.addEventListener('click', async () => {
            const savedKey = localStorage.getItem('supreme_gemini_key');
            if (!savedKey) {
                alert("Please go to the Fundamental Analysis section and connect your Google Gemini API key first.");
                return;
            }

            btcSyncBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> Analyzing Bitcoin...';
            document.getElementById('btc-smc-structure').textContent = "Scanning and Analyzing Bitcoin...";
            document.getElementById('btc-buy-insight-text').textContent = "Analyzing key levels...";
            document.getElementById('btc-sell-insight-text').textContent = "Scanning liquidity pools...";

            try {
                let liveBtcPrice = "$90,000.00";
                try {
                    const tdRes = await fetch('https://api.twelvedata.com/price?symbol=BTC/USD&apikey=312469dd3eda4f7e97d2853007361186');
                    const tdData = await tdRes.json();
                    if (tdData && tdData.price) {
                        liveBtcPrice = `$${parseFloat(tdData.price).toFixed(2)}`;
                    }
                } catch (e) {
                    console.warn("Twelve Data fallback used for BTC.");
                }

                const btcPrompt = `You are a professional Smart Money Concepts (SMC) trader analyzing Bitcoin (BTCUSD). The live price is ${liveBtcPrice}. Base all Support & Resistance, Order Blocks, Fair Value Gap, SMC, ICT, Fibonacci, Range & Deviation, Quasimodo, Price Action and Entry levels strictly around this current price. Return strictly a JSON object with this exact structure, NO markdown formatting, NO backticks:
{
   "marketBias": "4 Words. Determine the market bias based on higher- and lower-timeframe market structure, BOS/CHoCH, liquidity sweeps, price action, momentum, and confluence from support/resistance, order blocks, FVGs, and Fibonacci levels; assign a strong bias only when multiple independent signals align, use Neutral / Ranging when direction is unclear, and Wait for Confirmation when a potential setup lacks a valid entry trigger.",
  "confidenceScore": "3 Words. Rate the analysis based on the alignment of multi-timeframe market structure, liquidity behavior, price action, momentum, and confluence; assign higher confidence only when multiple independent signals agree and reliable market data is available, and lower confidence when signals conflict, confirmation is missing, or data is insufficient.",
  "smcStructure": "8-10 sentences explaining market structure, Base all Support & Resistance, Order Blocks, Fair Value Gap, SMC, ICT, Fibonacci (Golden Zone), Range & Deviation, Inducement, Threshold Level, Opening/Close Level (varies), Quasimodo / Quasimodo Pattern, Price Action,  equal highs/lows (EQH/EQL), previous day/week/month highs and lows, session highs/lows. PROVIDE THE SPECIFIC PRICE",
  "buyInsight": "2-3 sentences. Identify key support and resistance zones with specific prices",
  "sellInsight": "2-3 sentences. Identify Buy-Side Liquidity (BSL), Sell-Side Liquidity (SSL), internal/external range liquidity (IRL/ERL), and potential liquidity sweeps. woth specific prices",
  "buySetupDesc": "1-2 concise sentences explaining for buy entries based on the analysis in marketBias, confidence Score, smcStructure, buyInsight and sellInsight",
  "buyLot": "0.1 - 2 Base on the confidence",
  "buyEntry": "Price",
  "buySl": "Price",
  "buyTp": "Price",
  "sellSetupDesc": "1-2 concise sentences explaining for sell entries based on the analysis in marketBias, confidence Score, smcStructure, buyInsight and sellInsight",
  "sellLot": "0.1 - 2  Base on the confidence",
  "sellEntry": "Price",
  "sellSl": "Price",
  "sellTp": "Price"
}`;

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${savedKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: btcPrompt }] }],
                        generationConfig: { responseMimeType: "application/json" }
                    })
                });

                const rawData = await response.json();
                if (!response.ok) throw new Error(rawData.error?.message || "API Request Failed");

                let aiText = rawData.candidates[0].content.parts[0].text;
                aiText = aiText.replace(/```json/gi, '').replace(/```/gi, '').trim();
                const aiData = JSON.parse(aiText);

                // Populate UI Elements
                document.getElementById('btc-market-bias').textContent = aiData.marketBias;
                document.getElementById('btc-confidence-score').textContent = aiData.confidenceScore;
                document.getElementById('btc-smc-structure').textContent = aiData.smcStructure;
                document.getElementById('btc-buy-insight-text').textContent = aiData.buyInsight;
                document.getElementById('btc-sell-insight-text').textContent = aiData.sellInsight;

                document.getElementById('btc-buy-setup-desc').textContent = aiData.buySetupDesc || '';
                document.getElementById('btc-buy-lot').textContent = aiData.buyLot || '0.01';
                document.getElementById('btc-buy-entry').textContent = aiData.buyEntry || '--';
                document.getElementById('btc-buy-sl').textContent = aiData.buySl || '--';
                document.getElementById('btc-buy-tp').textContent = aiData.buyTp || '--';

                document.getElementById('btc-sell-setup-desc').textContent = aiData.sellSetupDesc || '';
                document.getElementById('btc-sell-lot').textContent = aiData.sellLot || '0.01';
                document.getElementById('btc-sell-entry').textContent = aiData.sellEntry || '--';
                document.getElementById('btc-sell-sl').textContent = aiData.sellSl || '--';
                document.getElementById('btc-sell-tp').textContent = aiData.sellTp || '--';

            } catch (error) {
                console.error("BTC Sync Error:", error);
                document.getElementById('btc-smc-structure').textContent = `Connection Error: ${error.message}`;
            } finally {
                btcSyncBtn.innerHTML = '<i class="fas fa-solid fa-magnifying-glass-dollar" style="margin-right: 8px;"></i> Sync Live Chart Insight';
            }
        });
    }
});

// FIND where window.syncAnalysisToLiveSignal is called in your BTC sync block and update it:
if (typeof window.syncAnalysisToLiveSignal === 'function') {
    window.syncAnalysisToLiveSignal(
        aiData.recommendedDirection,
        aiData.entry,
        aiData.sl,
        aiData.tp,
        'BITCOIN' // <--- Ensures it records and broadcasts as BITCOIN
    );
    alert('🔥 BTC AI Setup Synced! Check the Live Signal Form.');
}

function initBtcTradingView() {
    const container = document.getElementById('btc-tv_chart_widget');
    if (!container) return;
    container.innerHTML = ""; // Clear container to prevent duplicate widgets

    new TradingView.widget({
        "autosize": true,
        "symbol": "BINANCE:BTCUSDT",
        "interval": "15",
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "backgroundColor": "#0D0D0D",
        "gridColor": "rgba(255, 255, 255, 0.05)",
        "hide_top_toolbar": false,
        "hide_legend": false,
        "save_image": false,
        "container_id": "btc-tv_chart_widget",
        "studies": [
            "Volume@tv-basicstudies",
            "MASimple@tv-basicstudies"
        ],
        "disabled_features": [
            "header_symbol_search",
            "header_compare"
        ]
    });
}

// Ensure BTC chart initializes when its tab is clicked
document.addEventListener('DOMContentLoaded', () => {
    const btcNavBtn = document.querySelector('[data-target="btc-chart"]');
    if (btcNavBtn) {
        btcNavBtn.addEventListener('click', () => {
            setTimeout(initBtcTradingView, 100);
        });
    }
});

// --- NASDAQ (NAS100) CHART & AI ANALYSIS LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    const nasdaqNavBtn = document.querySelector('[data-target="nasdaq-chart"]');
    if (nasdaqNavBtn) {
        nasdaqNavBtn.addEventListener('click', () => {
            initNasdaqTradingView();
        });
    }
});

const nasdaqSyncBtn = document.getElementById('nasdaq-btn-chart-sync');
if (nasdaqSyncBtn) {
    nasdaqSyncBtn.addEventListener('click', async () => {
            // --- PHT TIME RESTRICTION CHECK ---
        const nowPht = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
        const currentHours = nowPht.getHours();
        const currentMinutes = nowPht.getMinutes();
        const totalMinutes = currentHours * 60 + currentMinutes;

        // Allowed PHT slots in minutes from midnight (with a 15-minute window for each):
        // 1. 8:00 AM = 480 mins (Allowed: 08:00 - 08:15)
        // 2. 3:30 PM = 930 mins (Allowed: 15:30 - 15:45)
        // 3. 9:30 PM = 1290 mins (Allowed: 21:30 - 21:45)
        const allowedSlots = [
            { start: 480, end: 495, label: "8:00 AM PHT" },
            { start: 930, end: 945, label: "3:30 PM PHT" },
            { start: 1290, end: 1305, label: "9:30 PM PHT" }
        ];

        const isValidTime = allowedSlots.some(slot => totalMinutes >= slot.start && totalMinutes <= slot.end);

        if (!isValidTime) {
            alert('⚠️ NASDAQ chart insight can only be synced at 8:00 AM, 3:30 PM, and 9:30 PM PHT.');
            return;
        }
        const savedKey = localStorage.getItem('supreme_gemini_key');
        if (!savedKey) {
            alert('Please go to the Fundamental Analysis section and connect your Google Gemini API key first.');
            return;
        }

        nasdaqSyncBtn.innerHTML = `<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> Analyzing NAS100...`;
        document.getElementById('nasdaq-buy-insight-text').textContent = "Scanning NAS100 price action...";
        document.getElementById('nasdaq-sell-insight-text').textContent = "Scanning liquidity pools...";

        try {
            let liveNasPrice = '20,000.00';
            try {
                const twRes = await fetch('https://api.twelvedata.com/price?symbol=IXIC&apikey=8b567cde22204705a0071bc156e37846');
                const twData = await twRes.json();
                if (twData && twData.price) {
                    liveNasPrice = `$${parseFloat(twData.price).toFixed(2)}`;
                }
            } catch (e) {
                console.warn('Twelve Data fallback used for NASDAQ.');
            }

            const nasdaqPrompt = `You are a professional trader who trades positioning scalping to intraday analyzing EURUSD. The live price is ${liveNasPrice}. Base all Support & Resistance, Order Blocks, Fair Value Gap, SMC, ICT, Fibonacci (Golden Zone), Range & Deviation, Inducement, Threshold Level, Opening/Close Level (varies), Quasimodo / Quasimodo Pattern, Price Action,  equal highs/lows (EQH/EQL), previous day/week/month highs and lows, session highs/lows and Entry/SL/TP levels strictly around this current price. 

{
  "marketBias": "4 Words. Determine the market bias based on higher- and lower-timeframe market structure, BOS/CHoCH, liquidity sweeps, price action, momentum, and confluence from support/resistance, order blocks, FVG, and Fibonacci levels; assign a strong bias only when multiple independent signals align, use Neutral / Ranging when direction is unclear, and Wait for Confirmation when a potential setup lacks a valid entry trigger.",
  "confidenceScore": "3 Words. Rate the analysis based on the alignment of multi-timeframe market structure, liquidity behavior, price action, momentum, and confluence; assign higher confidence only when multiple independent signals agree and reliable market data is available, and lower confidence when signals conflict, confirmation is missing, or data is insufficient.",
  "smcStructure": "8-10 sentences explaining market structure, Base all Support & Resistance, Order Blocks, Fair Value Gap, SMC, ICT, Fibonacci (Golden Zone), Range & Deviation, Inducement, Threshold Level, Opening/Close level (wicks), Quasimodo & Price Action, = equal highs/lows (EQH/EQL), previous day/week/month highs and lows, session highs/lows. PROVIDE THE SPECIFIC PRICE.",
  "buyInsight": "2-3 sentences. Identify key support and resistance zones with specific prices.",
  "sellInsight": "2-3 sentences. Identify Buy-Side Liquidity (BSL), Sell-Side Liquidity (SSL), internal/external range liquidity (IRL/ERL), and potential liquidity sweeps, with specific prices.",
  "buySetupDesc": "1-2 concise sentences explaining for buy entries based on the analysis in marketBias, confidenceScore, smcStructure, buyInsight and sellInsight.",
  "buyLot": "0.1 - 2 Base on the confidence",
  "buyEntry": "Price",
  "buySl": "Price",
  "buyTp": "Price",
  "sellSetupDesc": "1-2 concise sentences explaining for sell entries based on the analysis in marketBias, confidenceScore, smcStructure, buyInsight and sellInsight.",
  "sellLot": "0.1 - 2 Base on the confidence",
  "sellEntry": "Price",
  "sellSl": "Price",
  "sellTp": "Price"
}`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${savedKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: nasdaqPrompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });

            const rawData = await response.json();
            if (!response.ok) throw new Error(rawData.error?.message || "API Request Failed");

            let aiText = rawData.candidates[0].content.parts[0].text;
            aiText = aiText.replace(/```json/gi, '').replace(/```/gi, '').trim();
            const aiData = JSON.parse(aiText);

            // Populate UI Elements safely
            document.getElementById('nasdaq-market-bias').textContent = aiData.marketBias || 'N/A';
            document.getElementById('nasdaq-confidence-score').textContent = aiData.confidenceScore || 'N/A';
            document.getElementById('nasdaq-smc-structure').textContent = aiData.smcStructure || 'N/A';
            document.getElementById('nasdaq-buy-insight-text').textContent = aiData.buyInsight || 'N/A';
            document.getElementById('nasdaq-sell-insight-text').textContent = aiData.sellInsight || 'N/A';

            document.getElementById('nasdaq-buy-setup-desc').textContent = aiData.buySetupDesc || '';
            document.getElementById('nasdaq-buy-lot').textContent = aiData.buyLot || '0.01';
            document.getElementById('nasdaq-buy-entry').textContent = aiData.buyEntry || '--';
            document.getElementById('nasdaq-buy-sl').textContent = aiData.buySl || '--';
            document.getElementById('nasdaq-buy-tp').textContent = aiData.buyTp || '--';

            document.getElementById('nasdaq-sell-setup-desc').textContent = aiData.sellSetupDesc || '';
            document.getElementById('nasdaq-sell-lot').textContent = aiData.sellLot || '0.01';
            document.getElementById('nasdaq-sell-entry').textContent = aiData.sellEntry || '--';
            document.getElementById('nasdaq-sell-sl').textContent = aiData.sellSl || '--';
            document.getElementById('nasdaq-sell-tp').textContent = aiData.sellTp || '--';

        } catch (error) {
            console.error('NAS100 Sync Error:', error);
            document.getElementById('nasdaq-smc-structure').textContent = `Connection Error: ${error.message}`;
        } finally {
            nasdaqSyncBtn.innerHTML = `<i class="fas fa-solid fa-magnifying-glass-dollar" style="margin-right: 8px;"></i> Sync NAS100 Chart Insight`;
        }
    });
}

// FIND where window.syncAnalysisToLiveSignal is called in your BTC sync block and update it:
if (typeof window.syncAnalysisToLiveSignal === 'function') {
    window.syncAnalysisToLiveSignal(
        aiData.recommendedDirection,
        aiData.entry,
        aiData.sl,
        aiData.tp,
        'NASDAQ' // <--- Ensures it records and broadcasts as BITCOIN
    );
    alert('🔥 NASDAQ AI Setup Synced! Check the Live Signal Form.');
}

function initNasdaqTradingView() {
    const container = document.getElementById('nasdaq-tv_chart_widget');
    if (!container) return;
    container.innerHTML = ""; // Clear container to prevent duplicate widgets

    new TradingView.widget({
        "autosize": true,
        "symbol": "CAPITALCOM:US100", // NAS100 / Nasdaq 100 symbol feed
        "interval": "15",
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "backgroundColor": "#000000",
        "gridColor": "rgba(255, 255, 255, 0.05)",
        "hide_top_toolbar": false,
        "hide_legend": false,
        "save_image": false,
        "container_id": "nasdaq-tv_chart_widget",
        "studies": [
            "Volume@tv-basicstudies",
            "MASimple@tv-basicstudies"
        ],
        "disabled_features": [
            "header_symbol_search",
            "header_compare"
        ]
    });}
