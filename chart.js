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

                const btcPrompt = `You are a professional trader who trades positioning scalping to intraday analyzing BITCOIN (BTCUSD). The live price is ${liveBtcPrice}. Base all Support & Resistance, Order Blocks, Fair Value Gap, SMC, ICT, Fibonacci (Golden Zone), Range & Deviation, Inducement, Threshold Level, Opening/Close Level (varies), Quasimodo / Quasimodo Pattern, Price Action,  equal highs/lows (EQH/EQL), previous day/week/month highs and lows, session highs/lows, Institutional Price Resistance and Support (provide also what session is this between Asia, London and New York), Retailers Price Resistance and Support (provide also what session is this between Asia, London and New York), Highs and Lows of every session (Asia/Tokyo, London, New York) and Entry/SL/TP levels strictly around this current price. 
{
  "marketBias": "4 Words. Determine the market bias based on higher- and lower-timeframe market structure, BOS/CHoCH, liquidity sweeps, price action, momentum, and confluence from support/resistance, order blocks, FVGs, and Fibonacci levels; assign a strong bias only when multiple independent signals align, use Neutral / Ranging when direction is unclear, and Wait for Confirmation when a potential setup lacks a valid entry trigger.",
  "confidenceScore": "3 Words. Rate the analysis based on the alignment of multi-timeframe market structure, liquidity behavior, price action, momentum, and confluence; assign higher confidence only when multiple independent signals agree and reliable market data is available, and lower confidence when signals conflict, confirmation is missing, or data is insufficient.",
  "smcStructure": "15 sentences explaining market structure, Base all Support & Resistance, Order Blocks, Fair Value Gap, SMC, ICT, Fibonacci (Golden Zone), Range & Deviation, Inducement, Threshold Level, Opening/Close Level (varies), Quasimodo / Quasimodo Pattern, Price Action,  equal highs/lows (EQH/EQL), previous day/week/month highs and lows, session highs/lows and Institutional Price Resistance and Support (provide also what session is this between Asia, London and New York), Retailers Price Resistance and Support (provide also what session is this between Asia, London and New York), Highs and Lows of every session (Asia/Tokyo, London, New York). PROVIDE THE SPECIFIC PRICES",
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

// --- eurusd CHART & AI ANALYSIS LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    const eurusdNavBtn = document.querySelector('[data-target="eurusd-chart"]');
    if (eurusdNavBtn) {
        eurusdNavBtn.addEventListener('click', () => {
            initEurusdTradingView();
        });
    }
});

const eurusdSyncBtn = document.getElementById('eurusd-btn-chart-sync');
if (eurusdSyncBtn) {
    eurusdSyncBtn.addEventListener('click', async () => {
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
            { start: 480, end: 485, label: "8:00 AM PHT" },
            { start: 930, end: 935, label: "3:30 PM PHT" },
            { start: 1290, end: 1295, label: "9:30 PM PHT" }
        ];

        const isValidTime = allowedSlots.some(slot => totalMinutes >= slot.start && totalMinutes <= slot.end);

        if (!isValidTime) {
            alert('⚠️ EUR/USD chart insight can only be synced at 8:00 AM, 3:30 PM, and 9:30 PM PHT.');
            return;
        }
        const savedKey = localStorage.getItem('supreme_gemini_key');
        if (!savedKey) {
            alert('Please go to the Fundamental Analysis section and connect your Google Gemini API key first.');
            return;
        }

        eurusdSyncBtn.innerHTML = `<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> Analyzing EURUSD...`;
        document.getElementById('eurusd-buy-insight-text').textContent = "Scanning EURUSD price action...";
        document.getElementById('eurusd-sell-insight-text').textContent = "Scanning liquidity pools...";

        try {
            let liveEurusdPrice = '1.0850'; // Fallback baseline
            
            // Fetch live spot price directly using Twelve Data API
            const res = await fetch('https://api.twelvedata.com/price?symbol=EUR/USD&apikey=8b567cde22204705a0071bc156e37846');
            const data = await res.json();
            
            console.log("Twelve Data Raw Response:", data); // Check your browser console to see what is returned
            
            if (data && data.price) {
                liveEurusdPrice = parseFloat(data.price).toFixed(4);
                console.log("🔥 Successfully fetched live EUR/USD price:", liveEurusdPrice);
            } else if (data && data.message) {
                throw new Error(`Twelve Data API Error: ${data.message}`);
            } else {
                throw new Error("Unexpected response structure from Twelve Data.");
            }

            const eurusdPrompt = `You are a professional trader who trades positioning scalping to intraday analyzing EURUSD. The live price is ${liveEurusdPrice}. Base all Support & Resistance, Order Blocks, Fair Value Gap, SMC, ICT, Fibonacci (Golden Zone), Range & Deviation, Inducement, Threshold Level, Opening/Close Level (varies), Quasimodo / Quasimodo Pattern, Price Action,  equal highs/lows (EQH/EQL), previous day/week/month highs and lows, session highs/lows, Institutional Price Resistance and Support (provide also what session is this between Asia, London and New York), Retailers Price Resistance and Support (provide also what session is this between Asia, London and New York), Highs and Lows of every session (Asia/Tokyo, London, New York) and Entry/SL/TP levels strictly around this current price. 

{
  "marketBias": "4 Words. Determine the market bias based on higher- and lower-timeframe market structure, BOS/CHoCH, liquidity sweeps, price action, momentum, and confluence from support/resistance, order blocks, FVG, and Fibonacci levels; assign a strong bias only when multiple independent signals align, use Neutral / Ranging when direction is unclear, and Wait for Confirmation when a potential setup lacks a valid entry trigger.",
  "confidenceScore": "3 Words. Rate the analysis based on the alignment of multi-timeframe market structure, liquidity behavior, price action, momentum, and confluence; assign higher confidence only when multiple independent signals agree and reliable market data is available, and lower confidence when signals conflict, confirmation is missing, or data is insufficient.",
  "smcStructure": "15 sentences explaining market structure, Base all Support & Resistance, Order Blocks, Fair Value Gap, SMC, ICT, Fibonacci (Golden Zone), Range & Deviation, Inducement, Threshold Level, Opening/Close Level (varies), Quasimodo / Quasimodo Pattern, Price Action,  equal highs/lows (EQH/EQL), previous day/week/month highs and lows, session highs/lows and Institutional Price Resistance and Support (provide also what session is this between Asia, London and New York), Retailers Price Resistance and Support (provide also what session is this between Asia, London and New York), Highs and Lows of every session (Asia/Tokyo, London, New York). PROVIDE THE SPECIFIC PRICES",
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
                    contents: [{ parts: [{ text: eurusdPrompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });

            const rawData = await response.json();
            if (!response.ok) throw new Error(rawData.error?.message || "API Request Failed");

            let aiText = rawData.candidates[0].content.parts[0].text;
            aiText = aiText.replace(/```json/gi, '').replace(/```/gi, '').trim();
            const aiData = JSON.parse(aiText);

            // Populate UI Elements safely
            document.getElementById('eurusd-market-bias').textContent = aiData.marketBias || 'N/A';
            document.getElementById('eurusd-confidence-score').textContent = aiData.confidenceScore || 'N/A';
            document.getElementById('eurusd-smc-structure').textContent = aiData.smcStructure || 'N/A';
            document.getElementById('eurusd-buy-insight-text').textContent = aiData.buyInsight || 'N/A';
            document.getElementById('eurusd-sell-insight-text').textContent = aiData.sellInsight || 'N/A';

            document.getElementById('eurusd-buy-setup-desc').textContent = aiData.buySetupDesc || '';
            document.getElementById('eurusd-buy-lot').textContent = aiData.buyLot || '0.01';
            document.getElementById('eurusd-buy-entry').textContent = aiData.buyEntry || '--';
            document.getElementById('eurusd-buy-sl').textContent = aiData.buySl || '--';
            document.getElementById('eurusd-buy-tp').textContent = aiData.buyTp || '--';

            document.getElementById('eurusd-sell-setup-desc').textContent = aiData.sellSetupDesc || '';
            document.getElementById('eurusd-sell-lot').textContent = aiData.sellLot || '0.01';
            document.getElementById('eurusd-sell-entry').textContent = aiData.sellEntry || '--';
            document.getElementById('eurusd-sell-sl').textContent = aiData.sellSl || '--';
            document.getElementById('eurusd-sell-tp').textContent = aiData.sellTp || '--';

        } catch (error) {
            console.error('EURUSD Sync Error:', error);
            document.getElementById('eurusd-smc-structure').textContent = `Connection Error: ${error.message}`;
        } finally {
            eurusdSyncBtn.innerHTML = `<i class="fas fa-solid fa-magnifying-glass-dollar" style="margin-right: 8px;"></i> Sync EURUSD Chart Insight`;
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
        'EURUSD' // <--- Ensures it records and broadcasts as BITCOIN
    );
    alert('🔥 EURUSD AI Setup Synced! Check the Live Signal Form.');
}

function initEurusdTradingView() {
    const container = document.getElementById('eurusd-tv_chart_widget');
    if (!container) return;
    container.innerHTML = ""; // Clear container to prevent duplicate widgets
    
    new TradingView.widget({
        "autosize": true,
        "symbol": "OANDA:EURUSD", // EUR/USD Forex Spot Feed
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
        "container_id": "eurusd-tv_chart_widget",
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

function fillEntryTrackerForAsset(prefix, pairName, type) {
    const isBuy = type === 'BUY';
    
    // Look up prefixed ID first (e.g., eurusd-buy-entry, btc-buy-entry), fallback to generic (buy-entry)
    const entryEl = document.getElementById(`${prefix}-${isBuy ? 'buy' : 'sell'}-entry`) || document.getElementById(isBuy ? 'buy-entry' : 'sell-entry');
    const slEl = document.getElementById(`${prefix}-${isBuy ? 'buy' : 'sell'}-sl`) || document.getElementById(isBuy ? 'buy-sl' : 'sell-sl');
    const tpEl = document.getElementById(`${prefix}-${isBuy ? 'buy' : 'sell'}-tp`) || document.getElementById(isBuy ? 'buy-tp' : 'sell-tp');

    const entryVal = parseFloat(entryEl?.textContent);
    const slVal = parseFloat(slEl?.textContent);
    const tpVal = parseFloat(tpEl?.textContent);

    if (isNaN(entryVal) || isNaN(tpVal)) {
        showCustomModal(`Please sync the ${pairName} chart insight first before tracking your entry.`);
        return;
    }

    // 1. Automatically set the correct Pair in the Entry Tracker dropdown
    const pairSelect = document.getElementById('sig-pair');
    if (pairSelect) {
        for (let opt of pairSelect.options) {
            if (opt.value.toUpperCase().includes(pairName) || opt.text.toUpperCase().includes(pairName)) {
                pairSelect.value = opt.value;
                break;
            }
        }
    }

    // 2. Set Direction automatically
    const directionSelect = document.getElementById('sig-direction');
    if (directionSelect) directionSelect.value = type;

    // 3. Set Entry and Stop Loss
    document.getElementById('sig-entry').value = entryVal;
    document.getElementById('sig-sl').value = isNaN(slVal) ? '' : slVal;

    // 4. Set Main TP8 (1.00)
    document.getElementById('sig-tp8').value = tpVal.toFixed(2);

    // 5. Calculate TP1 to TP7 using your exact percentage ratios
    const percentages = { tp1: 0.13, tp2: 0.25, tp3: 0.38, tp4: 0.50, tp5: 0.63, tp6: 0.75, tp7: 0.88 };
    const totalDistance = tpVal - entryVal;

    for (const [key, pct] of Object.entries(percentages)) {
        const inputEl = document.getElementById(`sig-${key}`);
        if (inputEl) {
            const calculatedTp = entryVal + (totalDistance * pct);
            inputEl.value = calculatedTp.toFixed(2);
        }
    }

// 6. Properly switch to the Entry Tracker tab, update sidebar, and display section
    // 6. Switch to the Entry Tracker tab naturally using your app's built-in navigation
    const trackerNav = Array.from(document.querySelectorAll('.nav-link, a, button')).find(el => 
        (el.getAttribute('data-target') === 'view-signal') || 
        (el.textContent && el.textContent.includes('Entry Tracker'))
    );
    
    if (trackerNav) {
        trackerNav.click(); // Triggers your dashboard's native tab switcher cleanly
    }

    // Smooth scroll directly down to the Entry Tracker form after switching views
    setTimeout(() => {
        const signalSection = document.getElementById('view-signal');
        if (signalSection) {
            signalSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 150);

    showCustomModal(`✅ ${pairName} (${type}) setup successfully auto-filled & opened in Entry Tracker!`);
}
