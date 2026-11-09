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
  "marketBias": "5 words",
  "confidenceScore": "5 words",
  "smcStructure": "8-10 sentences analyzing ${activeAssetName} market structure, BOS/CHoCH Fair Value Gaps (FVG), and order blocks.",
  "buyInsight": "3 concise sentences explaining specific support levels or buy entries WITH SPECIFIC PRICES for ${activeAssetName}.",
  "sellInsight": "3 concise sentences explaining specific resistance levels or sell entries WITH SPECIFIC PRICES for ${activeAssetName}."
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
                    btnChartSync.innerHTML = `<i class="fas fa-solid fa-magnifying-glass-dollar" style="margin-right: 8px;"></i> Sync Live Chart Insight`;
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
            alert("Please go to the Fundamental Analysis section and connect your free Google Gemini API key first.");
            return;
        }
        
        btcSyncBtn.innerHTML = `<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> Analyzing Bitcoin...`;
        
        try {
            // Manual price entry popup (matches XAUUSD style)
            const { value: enteredPrice } = await Swal.fire({
                title: `Current Price (BTC)`,
                text: 'Enter the exact price currently shown on your TradingView chart:',
                input: 'text',
                background: '#131722',
                color: '#ffffff',
                confirmButtonColor: '#d4af37',
                cancelButtonColor: '#2a2e39',
                showCancelButton: true,
                inputValidator: (value) => {
                    if (!value || isNaN(parseFloat(value))) {
                        return 'Please enter a valid price number!';
                    }
                }
            });
            
            if (!enteredPrice) {
                btcSyncBtn.innerHTML = `<i class="fas fa-solid fa-magnifying-glass-dollar" style="margin-right: 8px;"></i> Sync Live Chart Insight`;
                return;
            }
            
            let livePriceText = `$${parseFloat(enteredPrice).toFixed(2)}`;
            
            const btcPrompt = `You are a professional crypto trader specializing in intraday and positioning trading for BTCUSD. Analyze BTCUSD using the live price ${livePriceText} as the current reference point.

Follow the exact JSON structure below with no markdown formatting or backticks:
{
  "bias": "5 words market bias determination.",
  "confidence": "5 words confidence rate.",
  "smcInstRetail": "7 sentences detailing Institutional Price Support/Resistance and Retailers Price Resistance/Support with specific prices (make the price to numbers form).",
  "smcSessions": "7 sentences analyzing session highs/lows with specific prices (make the price to numbers form).",
  "smcBlocksFvg": "7 sentences analyzing Order Blocks, FVGs, and Fibonacci levels with specific prices (make the price to numbers form).",
  "smcStructureAction": "7 sentences detailing Quasimodo patterns, Inducement, and price action (make the price to numbers form).",
  "supportResistance": "7 sentences detailing Key Support & Resistance with exact prices (make the price to numbers form).",
  "liquidityZones": "7 sentences detailing Liquidity Zones with exact prices (make the price to numbers form).",
    "buyLot": "0.05 - 0.5 (Based on the confidence)",
  "sellLot": "0.05 - 0.5 (Based on the confidence)",
  "buyScenario": { "condition": "3 SENTENCES Setup trigger with the Execution on 5 Minutes Time Frame (WITH SPECIFIC PRICE, make the price to numbers form). Be Precise and Careful with this because this is the most crucial part, give the best setup as much you could", "entry": "Price", "sl": "Price", "tp": "Price" },
  "sellScenario": { "condition": "3 SENTENCES Setup trigger with the Execution on 5 Minutes Time Frame (WITH SPECIFIC PRICE, make the price to numbers form). Be Precise and Careful with this because this is the most crucial part, give the best setup as much you could", "entry": "Price", "sl": "Price", "tp": "Price" },
  "mtfMonthly": { "trend": "1-2 words", "desc": "3 brief sentence on Monthly Time Frame Support and Resistance, make the price to numbers form" },
  "mtfDaily": { "trend": "1-2 words", "desc": "3 brief sentence on Daily Time Frame Support and Resistance, make the price to numbers form" },
  "mtfH4": { "trend": "1-2 words", "desc": "3 brief sentence on H4 Time Frame Support and Resistance, make the price to numbers form" }
}`;
            
            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=' + savedKey, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: btcPrompt }] }],
                    generationConfig: { responseMimeType: 'application/json' }
                })
            });
            
            const rawData = await response.json();
            if (!response.ok) throw new Error(rawData.error?.message || "API Request Failed");
            
            const aiText = rawData.candidates[0].content.parts[0].text;
            const aiData = JSON.parse(aiText);
            
            // Risk calculation helper matching XAUUSD
            const calculateLot = (entry, sl) => {
                const numEntry = parseFloat(String(entry).replace(/[^0-9.]/g, ''));
                const numSl = parseFloat(String(sl).replace(/[^0-9.]/g, ''));
                if (isNaN(numEntry) || isNaN(numSl)) return '0.05';
                return '0.5';
            };
            
            // Populate UI Elements
            if (document.getElementById('btc-market-bias')) document.getElementById('btc-market-bias').textContent = aiData.bias;
            if (document.getElementById('btc-confidence-score')) document.getElementById('btc-confidence-score').textContent = aiData.confidence;
            
            if (document.getElementById('btc-inst-retail')) document.getElementById('btc-inst-retail').textContent = aiData.smcInstRetail || '';
            if (document.getElementById('btc-sessions')) document.getElementById('btc-sessions').textContent = aiData.smcSessions || '';
            if (document.getElementById('btc-blocks-fvg')) document.getElementById('btc-blocks-fvg').textContent = aiData.smcBlocksFvg || '';
            if (document.getElementById('btc-structure-action')) document.getElementById('btc-structure-action').textContent = aiData.smcStructureAction || '';
            if (document.getElementById('btc-levels')) document.getElementById('btc-levels').textContent = aiData.supportResistance || '';
            if (document.getElementById('btc-liquidity')) document.getElementById('btc-liquidity').textContent = aiData.liquidityZones || '';
            
            // Buy Setup
            if (document.getElementById('btc-buy-setup-desc')) document.getElementById('btc-buy-setup-desc').textContent = aiData.buyScenario.condition;
            if (document.getElementById('btc-buy-entry')) document.getElementById('btc-buy-entry').textContent = aiData.buyScenario.entry;
            if (document.getElementById('btc-buy-sl')) document.getElementById('btc-buy-sl').textContent = aiData.buyScenario.sl;
            if (document.getElementById('btc-buy-tp')) document.getElementById('btc-buy-tp').textContent = aiData.buyScenario.tp;
            if (document.getElementById('btc-buy-lot')) document.getElementById('btc-buy-lot').textContent = calculateLot(aiData.buyScenario.entry, aiData.buyScenario.sl);
            
            // Sell Setup
            if (document.getElementById('btc-sell-setup-desc')) document.getElementById('btc-sell-setup-desc').textContent = aiData.sellScenario.condition;
            if (document.getElementById('btc-sell-entry')) document.getElementById('btc-sell-entry').textContent = aiData.sellScenario.entry;
            if (document.getElementById('btc-sell-sl')) document.getElementById('btc-sell-sl').textContent = aiData.sellScenario.sl;
            if (document.getElementById('btc-sell-tp')) document.getElementById('btc-sell-tp').textContent = aiData.sellScenario.tp;
            if (document.getElementById('btc-sell-lot')) document.getElementById('btc-sell-lot').textContent = calculateLot(aiData.sellScenario.entry, aiData.sellScenario.sl);
            
            // Multi-Timeframe Cards
            if (aiData.mtfMonthly && document.getElementById('btc-mtf-monthly-status')) {
                document.getElementById('btc-mtf-monthly-status').textContent = aiData.mtfMonthly.trend;
                document.getElementById('btc-mtf-monthly-text').textContent = aiData.mtfMonthly.desc;
            }
            if (aiData.mtfDaily && document.getElementById('btc-mtf-daily-status')) {
                document.getElementById('btc-mtf-daily-status').textContent = aiData.mtfDaily.trend;
                document.getElementById('btc-mtf-daily-text').textContent = aiData.mtfDaily.desc;
            }
            if (aiData.mtfH4 && document.getElementById('btc-mtf-h4-status')) {
                document.getElementById('btc-mtf-h4-status').textContent = aiData.mtfH4.trend;
                document.getElementById('btc-mtf-h4-text').textContent = aiData.mtfH4.desc;
            }
            
        } catch (error) {
            console.error("BTC Sync Error:", error);
            alert("Analysis failed: " + error.message);
        } finally {
            btcSyncBtn.innerHTML = `<i class="fas fa-solid fa-magnifying-glass-dollar" style="margin-right: 8px;"></i> Sync Live Chart Insight`;
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
        const savedKey = localStorage.getItem('supreme_gemini_key');
        if (!savedKey) {
            alert("Please go to the Fundamental Analysis section and connect your free Google Gemini API key first.");
            return;
        }

        eurusdSyncBtn.innerHTML = `<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> Analyzing EURUSD...`;

        try {
            // Manual price prompt (matches XAUUSD & BTC style)
            const { value: enteredPrice } = await Swal.fire({
                title: `Current Price (EURUSD)`,
                text: 'Enter the exact price currently shown on your TradingView chart:',
                input: 'text',
                background: '#131722',
                color: '#ffffff',
                confirmButtonColor: '#d4af37',
                cancelButtonColor: '#2a2e39',
                showCancelButton: true,
                inputValidator: (value) => {
                    if (!value || isNaN(parseFloat(value))) {
                        return 'Please enter a valid price number!';
                    }
                }
            });

            if (!enteredPrice) {
                eurusdSyncBtn.innerHTML = `<i class="fas fa-solid fa-magnifying-glass-dollar" style="margin-right: 8px;"></i> Sync Live Chart Insight`;
                return;
            }

            let livePriceText = parseFloat(enteredPrice).toFixed(4);

            const eurusdPrompt = `You are a professional forex trader specializing in intraday trading for EURUSD. Analyze EURUSD using the live price ${livePriceText} as the current reference point.

Follow the exact JSON structure below with no markdown formatting or backticks:
{
  "bias": "5 words market bias determination.",
  "confidence": "5 words confidence rate.",
  "smcInstRetail": "7 sentences detailing Institutional Price Support/Resistance and Retailers Price Resistance/Support with specific prices (make the price to numbers form).",
  "smcSessions": "7 sentences analyzing session highs/lows with specific prices (make the price to numbers form).",
  "smcBlocksFvg": "7 sentences analyzing Order Blocks, FVGs, and Fibonacci levels with specific prices (make the price to numbers form).",
  "smcStructureAction": "7 sentences detailing Quasimodo patterns, Inducement, and price action (make the price to numbers form).",
  "supportResistance": "7 sentences detailing Key Support & Resistance with exact prices (make the price to numbers form).",
  "liquidityZones": "7 sentences detailing Liquidity Zones with exact prices (make the price to numbers form).",
  "buyLot": "0.05 - 0.2 (Based on the confidence)",
  "sellLot": "0.05 - 0.2 (Based on the confidence)",
  "buyScenario": { "condition": "3 SENTENCES Setup trigger with the Execution on 5 Minutes Time Frame (WITH SPECIFIC PRICE, make the price to numbers form). Be Precise and Careful with this because this is the most crucial part, give the best setup as much you could", "entry": "Price", "sl": "Price", "tp": "Price" },
  "sellScenario": { "condition": "3 SENTENCES Setup trigger with the Execution on 5 Minutes Time Frame (WITH SPECIFIC PRICE, make the price to numbers form). Be Precise and Careful with this because this is the most crucial part, give the best setup as much you could", "entry": "Price", "sl": "Price", "tp": "Price" },
  "mtfDaily": { "trend": "1-2 words", "desc": "3 brief sentence on Monthly Time Frame Support and Resistance, make the price to numbers form" },
  "mtfH4": { "trend": "1-2 words", "desc": "3 brief sentence on Daily Time Frame Support and Resistance, make the price to numbers form" },
  "mtfH1": { "trend": "1-2 words", "desc": "3 brief sentence on H4 Time Frame Support and Resistance, make the price to numbers form" }
}`;

            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=' + savedKey, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: eurusdPrompt }] }],
                    generationConfig: { responseMimeType: 'application/json' }
                })
            });

            const rawData = await response.json();
            if (!response.ok) throw new Error(rawData.error?.message || "API Request Failed");

            const aiText = rawData.candidates[0].content.parts[0].text;
            const aiData = JSON.parse(aiText);

            // Risk calculation helper
            const calculateLot = (entry, sl) => {
                const numEntry = parseFloat(String(entry).replace(/[^0-9.]/g, ''));
                const numSl = parseFloat(String(sl).replace(/[^0-9.]/g, ''));
                if (isNaN(numEntry) || isNaN(numSl)) return '0.05';
                return '0.2';
            };

            // Populate UI Elements
            if (document.getElementById('eurusd-market-bias')) document.getElementById('eurusd-market-bias').textContent = aiData.bias;
            if (document.getElementById('eurusd-confidence-score')) document.getElementById('eurusd-confidence-score').textContent = aiData.confidence;
            
            if (document.getElementById('eurusd-inst-retail')) document.getElementById('eurusd-inst-retail').textContent = aiData.smcInstRetail || '';
            if (document.getElementById('eurusd-sessions')) document.getElementById('eurusd-sessions').textContent = aiData.smcSessions || '';
            if (document.getElementById('eurusd-blocks-fvg')) document.getElementById('eurusd-blocks-fvg').textContent = aiData.smcBlocksFvg || '';
            if (document.getElementById('eurusd-structure-action')) document.getElementById('eurusd-structure-action').textContent = aiData.smcStructureAction || '';
            if (document.getElementById('eurusd-levels')) document.getElementById('eurusd-levels').textContent = aiData.supportResistance || '';
            if (document.getElementById('eurusd-liquidity')) document.getElementById('eurusd-liquidity').textContent = aiData.liquidityZones || '';

            // Buy Setup
            if (document.getElementById('eurusd-buy-setup-desc')) document.getElementById('eurusd-buy-setup-desc').textContent = aiData.buyScenario?.condition || '';
            if (document.getElementById('eurusd-buy-entry')) document.getElementById('eurusd-buy-entry').textContent = aiData.buyScenario?.entry || '--';
            if (document.getElementById('eurusd-buy-sl')) document.getElementById('eurusd-buy-sl').textContent = aiData.buyScenario?.sl || '--';
            if (document.getElementById('eurusd-buy-tp')) document.getElementById('eurusd-buy-tp').textContent = aiData.buyScenario?.tp || '--';
            if (document.getElementById('eurusd-buy-lot')) document.getElementById('eurusd-buy-lot').textContent = calculateLot(aiData.buyScenario?.entry, aiData.buyScenario?.sl);

            // Sell Setup
            if (document.getElementById('eurusd-sell-setup-desc')) document.getElementById('eurusd-sell-setup-desc').textContent = aiData.sellScenario?.condition || '';
            if (document.getElementById('eurusd-sell-entry')) document.getElementById('eurusd-sell-entry').textContent = aiData.sellScenario?.entry || '--';
            if (document.getElementById('eurusd-sell-sl')) document.getElementById('eurusd-sell-sl').textContent = aiData.sellScenario?.sl || '--';
            if (document.getElementById('eurusd-sell-tp')) document.getElementById('eurusd-sell-tp').textContent = aiData.sellScenario?.tp || '--';
            if (document.getElementById('eurusd-sell-lot')) document.getElementById('eurusd-sell-lot').textContent = calculateLot(aiData.sellScenario?.entry, aiData.sellScenario?.sl);

            // Multi-Timeframe Cards
            if (aiData.mtfDaily && document.getElementById('eurusd-mtf-daily-status')) {
                document.getElementById('eurusd-mtf-daily-status').textContent = aiData.mtfDaily.trend;
                document.getElementById('eurusd-mtf-daily-text').textContent = aiData.mtfDaily.desc;
            }
            if (aiData.mtfH4 && document.getElementById('eurusd-mtf-h4-status')) {
                document.getElementById('eurusd-mtf-h4-status').textContent = aiData.mtfH4.trend;
                document.getElementById('eurusd-mtf-h4-text').textContent = aiData.mtfH4.desc;
            }
            if (aiData.mtfH1 && document.getElementById('eurusd-mtf-h1-status')) {
                document.getElementById('eurusd-mtf-h1-status').textContent = aiData.mtfH1.trend;
                document.getElementById('eurusd-mtf-h1-text').textContent = aiData.mtfH1.desc;
            }

        } catch (error) {
            console.error("EURUSD Sync Error:", error);
            alert("Analysis failed: " + error.message);
        } finally {
            eurusdSyncBtn.innerHTML = `<i class="fas fa-solid fa-magnifying-glass-dollar" style="margin-right: 8px;"></i> Sync Live Chart Insight`;
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
        'EURUSD' // <--- Ensures it records and broadcasts as EURUSD
    );
    alert('🔥 EURUSD Setup Synced! Check the Live Signal Form.');
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

document.addEventListener('DOMContentLoaded', () => {
    const assets = [
        { prefix: 'eurusd', pairName: 'EURUSD' },
        { prefix: 'btc', pairName: 'BTC' },
        { prefix: 'xauusd', pairName: 'XAUUSD' }
    ];
    
    assets.forEach(asset => {
        const buyCard = document.getElementById(`${asset.prefix}-buy-card-trigger`) || document.getElementById('buy-card-trigger');
        const sellCard = document.getElementById(`${asset.prefix}-sell-card-trigger`) || document.getElementById('sell-card-trigger');
        
        if (buyCard) {
            buyCard.style.cursor = 'pointer';
            buyCard.addEventListener('click', () => fillEntryTrackerForAsset(asset.prefix, asset.pairName, 'BUY'));
        }
        if (sellCard) {
            sellCard.style.cursor = 'pointer';
            sellCard.addEventListener('click', () => fillEntryTrackerForAsset(asset.prefix, asset.pairName, 'SELL'));
        }
    });
});

function fillEntryTrackerForAsset(prefix, pairName, type) {
    const isBuy = type === 'BUY';
    
    // Lookup element IDs with fallback support
    const entryEl = document.getElementById(`${prefix}-${isBuy ? 'buy' : 'sell'}-entry`) || document.getElementById(isBuy ? 'buy-entry' : 'sell-entry');
    const s1El = document.getElementById(`${prefix}-${isBuy ? 'buy' : 'sell'}-sl`) || document.getElementById(`${prefix}-${isBuy ? 'buy' : 'sell'}-s1`) || document.getElementById(isBuy ? 'buy-sl' : 'sell-sl');
    const tpEl = document.getElementById(`${prefix}-${isBuy ? 'buy' : 'sell'}-tp`) || document.getElementById(isBuy ? 'buy-tp' : 'sell-tp');
    
    const entryVal = parseFloat(entryEl?.textContent);
    const slVal = parseFloat(s1El?.textContent);
    const tpVal = parseFloat(tpEl?.textContent);
    
    if (isNaN(entryVal) || isNaN(tpVal)) {
        alert(`Please sync the ${pairName} chart insight first before tracking your entry.`);
        return;
    }
    
    // 1. Automatically set the correct Pair in the Entry Tracker dropdown (stripping slashes for robust matching)
    const pairSelect = document.getElementById('sig-pair');
    if (pairSelect) {
        const cleanTarget = pairName.replace('/', '').toUpperCase();
        for (let opt of pairSelect.options) {
            const optClean = opt.value.replace('/', '').toUpperCase();
            const optTextClean = opt.text.replace('/', '').toUpperCase();
            if (optClean.includes(cleanTarget) || optTextClean.includes(cleanTarget)) {
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
    document.getElementById('sig-sl').value = !isNaN(slVal) ? slVal : '';
    
    // Determine decimals based on asset (Forex EURUSD needs 4 decimals; XAUUSD/BTC needs 2)
    const decimals = pairName.includes('EUR') ? 4 : 2;
    
    // 4. Set Main TP8 (1.00)
    document.getElementById('sig-tp8').value = tpVal.toFixed(decimals);
    
    // 5. Calculate TP1 to TP7 using exact percentage ratios
    const percentages = { tp1: 0.13, tp2: 0.25, tp3: 0.38, tp4: 0.50, tp5: 0.63, tp6: 0.75, tp7: 0.88 };
    const totalDistance = tpVal - entryVal;
    
    for (const [key, pct] of Object.entries(percentages)) {
        const inputEl = document.getElementById(`sig-${key}`);
        if (inputEl) {
            const calculatedTp = entryVal + (totalDistance * pct);
            inputEl.value = calculatedTp.toFixed(decimals);
        }
    }
    
// 6. Properly switch to the Entry Tracker tab, update sidebar, and display section
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

    // (Popup alert removed completely for instant transition)
}