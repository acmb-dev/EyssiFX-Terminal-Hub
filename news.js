document.addEventListener("DOMContentLoaded", () => {
    let countdownInterval;

    // ==========================================
    // 1. ECONOMIC CALENDAR SYNC (Kept Intact)
    // ==========================================
async function syncForexFactoryData() {
    const rawUrl = `https://nfs.faireconomy.media/ff_calendar_thisweek.json?_=${Date.now()}`;
    const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(rawUrl);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const response = await fetch(proxyUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error("Network blocked");
            
            const events = await response.json();
            const usdEvents = events.filter(e => e.country === 'USD');

            if (Array.isArray(usdEvents) && usdEvents.length > 0) {
                processAndRenderEvents(usdEvents);
            } else {
                useFallbackUsdData();
            }
        } catch (error) {
            useFallbackUsdData();
        }
    }

    function processAndRenderEvents(events) {
        const tbody = document.getElementById('calendar-body');
        if (!tbody) return;

        const now = new Date();
        tbody.innerHTML = '';

        let upcomingEvents = events.filter(e => new Date(e.date) > now);
        if (upcomingEvents.length === 0) upcomingEvents = events;

        upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
        const eventsToDisplay = upcomingEvents.slice(0, 10);

        eventsToDisplay.forEach(e => {
            const eventDate = new Date(e.date);
            const dateStr = eventDate.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: '2-digit' });
            const timeStr = eventDate.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true });

            let impactHtml = e.impact === 'High' ? `<span style="border: 1px solid #ff4444; color: #ff4444; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: bold;">HIGH</span>` 
                           : e.impact === 'Medium' ? `<span style="border: 1px solid var(--gold); color: var(--gold); padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: bold;">MEDIUM</span>`
                           : `<span style="border: 1px solid #00C851; color: #00C851; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: bold;">LOW</span>`;

            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 10px; color: #fff;">${dateStr} <span style="color: #a0aec0; margin-left: 6px;">${timeStr}</span></td>
                    <td style="padding: 10px; font-weight: bold; color: var(--gold);">${e.country}</td>
                    <td style="padding: 10px; color: #fff;">${e.title}</td>
                    <td style="padding: 10px;">${impactHtml}</td>
                    <td style="padding: 10px; color: #a0aec0;">${e.forecast || '--'}</td>
                    <td style="padding: 10px; color: #a0aec0;">${e.previous || '--'}</td>
                </tr>
            `;
        });
        startHighImpactCountdown(upcomingEvents);
    }

    function useFallbackUsdData() {
        const fallbackEvents = [
            { date: "2026-08-06T12:30:00Z", country: "USD", title: "Unemployment Claims", impact: "Medium", forecast: "235K", previous: "238K" },
            { date: "2026-08-07T12:30:00Z", country: "USD", title: "Non-Farm Employment Change", impact: "High", forecast: "175K", previous: "206K" }
        ];
        processAndRenderEvents(fallbackEvents);
    }

    function startHighImpactCountdown(upcomingEvents) {
        const timerEl = document.getElementById('high-impact-timer');
        if (!timerEl) return;
        if (countdownInterval) clearInterval(countdownInterval);

        const nextHighEvent = upcomingEvents.find(e => e.impact === 'High' && new Date(e.date) > new Date());
        if (!nextHighEvent) {
            timerEl.textContent = "No Upcoming High Impact"; return;
        }

        const targetTime = new Date(nextHighEvent.date).getTime();
        countdownInterval = setInterval(() => {
            const now = new Date().getTime();
            const diff = targetTime - now;

            if (diff <= 0) {
                clearInterval(countdownInterval);
                timerEl.textContent = "HAPPENING NOW"; return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)) + (days * 24);
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            timerEl.textContent = String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
        }, 1000);
    }

    // Check for saved Fundamental Analysis data and load it instantly
    const savedFundamentals = localStorage.getItem('saved_fundamental_data');
    if (savedFundamentals) {
        try {
            const aiData = JSON.parse(savedFundamentals);
            
            // Restore text elements
            document.getElementById('gold-title').textContent = aiData.goldTitle;
            document.getElementById('gold-desc').textContent = aiData.goldDesc;
            document.getElementById('dxy-title').textContent = aiData.dxyTitle;
            document.getElementById('dxy-desc').textContent = aiData.dxyDesc;
            document.getElementById('advisory-title').textContent = aiData.advisoryTitle;
            document.getElementById('advisory-desc').textContent = aiData.advisoryDesc;
            document.getElementById('fear-value').textContent = aiData.fearValue;
            document.getElementById('fear-text').textContent = aiData.fearText;
            document.getElementById('fear-desc').textContent = aiData.fearDesc;
            
            // Restore gauge color
            const fearGauge = document.getElementById('fear-value').parentElement;
            if (aiData.fearValue >= 60) fearGauge.style.borderColor = "#00C851";
            else if (aiData.fearValue <= 40) fearGauge.style.borderColor = "#ff4444";
            else fearGauge.style.borderColor = "var(--gold)";
        } catch (e) {
            console.error("Failed to load saved fundamentals", e);
        }
    }

    // ==========================================
    // 2. LIVE GOOGLE GEMINI INTEGRATION (100% FREE)
    // ==========================================
    const btnAnalyze = document.getElementById('btn-ai-analyze');
    const geminiModal = document.getElementById('gemini-modal');
    const btnSaveGemini = document.getElementById('btn-save-gemini');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const geminiKeyInput = document.getElementById('gemini-key-input');
    const geminiErrorText = document.getElementById('gemini-error-text');

    // Close the login modal
    btnCloseModal.addEventListener('click', () => {
        geminiModal.style.display = 'none';
        geminiErrorText.style.display = 'none';
    });

    // When clicking the main Sync button on the dashboard
    btnAnalyze.addEventListener('click', () => {
        // Check if the user is already "logged in" with a saved Gemini key
        const savedKey = localStorage.getItem('supreme_gemini_key');
        
        if (!savedKey) {
            // Show login modal if no key is saved
            geminiModal.style.display = 'flex';
            return;
        }

        // If they have a key, run the sync!
        runGeminiSync(savedKey);
    });

    // When they click "Connect & Authenticate" inside the modal
    btnSaveGemini.addEventListener('click', () => {
        const key = geminiKeyInput.value.trim();
        if (key === "") {
            geminiErrorText.textContent = "Please enter a valid key.";
            geminiErrorText.style.display = 'block';
            return;
        }
        
        // Save key to browser local storage (mimics a login session)
        localStorage.setItem('supreme_gemini_key', key);
        geminiModal.style.display = 'none';
        geminiErrorText.style.display = 'none';
        
        // Run sync immediately after login
        runGeminiSync(key);
    });

    async function runGeminiSync(apiKey) {
        // UI Loading State
        btnAnalyze.innerHTML = `<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> Syncing the Fundamental`;
        document.getElementById('ai-insight-cards').style.opacity = "0.4";
        document.getElementById('gold-title').textContent = "ANALYZING...";
        document.getElementById('dxy-title').textContent = "ANALYZING...";

        try {
            // Strict prompt formatting for Google Gemini
            const promptText = `You are an institutional-grade macroeconomic AI analyzing the latest fundamental conditions affecting XAUUSD (Gold) and DXY. Use the latest verifiable data from official sources, Forex Factory, Reuters, and other reliable financial sources. Never fabricate data or news; acknowledge unavailable information.
                Return strictly one valid JSON object with exactly these keys and no additional text:

{"goldTitle": "BULLISH / SLIGHTLY BULLISH / NEUTRAL / SLIGHTLY BEARISH / BEARISH",
"goldDesc": "Exactly 7 concise sentences.",
"dxyTitle": "BULLISH / SLIGHTLY BULLISH / NEUTRAL / SLIGHTLY BEARISH / BEARISH",
"dxyDesc": "Exactly 7 concise sentences.",
"advisoryTitle": "3-5 words",
"advisoryDesc": "Exactly 7 actionable sentences.",
"fearValue": 1-100,
"fearText": "GREED or FEAR",
"fearDesc": "Exactly 7 concise sentences."}

                Analyze the latest Fed decisions and interest-rate expectations, CPI/PCE inflation, employment, GDP, DXY, U.S. Treasury and real yields, geopolitical risks, central-bank gold purchases, gold ETF flows, and other major market-moving events.

                Compare actual economic releases with forecasts and previous readings, including revisions. Distinguish confirmed facts from expectations and identify what markets have already priced in.

                Determine the strongest current bullish and bearish drivers for gold and DXY. Explain how monetary policy, inflation, employment, real yields, dollar strength, and safe-haven demand interact. Prioritize fresh, high-impact evidence and actual market reactions over generic assumptions.

                Classify each outlook based on the overall balance of evidence. Do not automatically assume gold and DXY move inversely or that high inflation always supports gold.

                The advisory must state the fundamental bias, strongest supporting and opposing factors, DXY/yield implications, next major scheduled economic event, what could confirm or invalidate the bias, and the importance of technical confirmation and risk management.

                Assess fearValue from 1–100 using verifiable market sentiment indicators: 1–20 extreme fear, 21–40 elevated fear, 41–59 neutral/mixed, 60–80 elevated greed, and 81–100 extreme greed. Use FEAR below 40, GREED above 60, and the closer category to neutral; use FEAR at exactly 50. Do not fabricate sentiment data.

                All descriptions must contain exactly 7 concise sentences. Return valid JSON only, with no Markdown or text outside the object.`;

            // Call the 100% free Gemini API endpoint
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }],
                    generationConfig: { responseMimeType: "application/json" } // Forces strict JSON output natively
                })
            });

            const rawData = await response.json();

            // Catch Google API rejections (Invalid Key, etc.)
            if (!response.ok) {
                throw new Error(rawData.error?.message || "Google Gemini API Request Failed");
            }

            // Parse Gemini's JSON output
            const aiText = rawData.candidates[0].content.parts[0].text;
            const aiData = JSON.parse(aiText);

            // Inject the data directly into your HTML cards
            document.getElementById('gold-title').textContent = aiData.goldTitle;
            document.getElementById('gold-desc').textContent = aiData.goldDesc;
            document.getElementById('dxy-title').textContent = aiData.dxyTitle;
            document.getElementById('dxy-desc').textContent = aiData.dxyDesc;
            document.getElementById('advisory-title').textContent = aiData.advisoryTitle;
            document.getElementById('advisory-desc').textContent = aiData.advisoryDesc;
            document.getElementById('fear-value').textContent = aiData.fearValue;
            document.getElementById('fear-text').textContent = aiData.fearText;
            document.getElementById('fear-desc').textContent = aiData.fearDesc;

            // Adjust fear gauge border color based on AI's value
            const fearGauge = document.getElementById('fear-value').parentElement;
            if (aiData.fearValue >= 60) fearGauge.style.borderColor = "#00C851"; // Greed = Green
            else if (aiData.fearValue <= 40) fearGauge.style.borderColor = "#ff4444"; // Fear = Red
            else fearGauge.style.borderColor = "var(--gold)"; // Neutral = Gold
        // Save the entire AI fundamental object to local storage
        localStorage.setItem('saved_fundamental_data', JSON.stringify(aiData));

        } catch (error) {
            console.error("Gemini Sync Error:", error);
            
            // If the user entered a bad key, wipe the storage so they are prompted to "log in" again
            if (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID")) {
                localStorage.removeItem('supreme_gemini_key');
                geminiErrorText.textContent = "Authentication Failed: Invalid Google Gemini Key.";
                geminiErrorText.style.display = 'block';
                geminiModal.style.display = 'flex'; // Pop the login modal back up
            }

            // Print the error directly onto the UI cards
            document.getElementById('gold-title').textContent = "SYNC FAILED";
            document.getElementById('gold-desc').textContent = error.message;
            document.getElementById('dxy-title').textContent = "DISCONNECTED";
            document.getElementById('dxy-desc').textContent = "Please verify your Gemini connection.";
        } finally {
            // Restore UI state
            btnAnalyze.innerHTML = `<i class="fas fa-check" style="margin-right: 8px;"></i> Analysis Complete`;
            document.getElementById('ai-insight-cards').style.opacity = "1";
            
            // Reset button text after 3 seconds
            setTimeout(() => {
                btnAnalyze.innerHTML = `<i class="fas fa-solid fa-magnifying-glass-dollar" style="margin-right: 8px;"></i> Sync Live AI Market Analysis`;
            }, 3000);
        }
    }

    syncForexFactoryData();
});

let selectedAsset = "XAUUSD"; // Default active asset

// Global function to handle asset switching
function selectAsset(symbol) {
    selectedAsset = symbol;
    
    const btnXau = document.getElementById('asset-btn-xau');
    const btnUs30 = document.getElementById('asset-btn-us30');

    if (symbol === 'XAUUSD') {
        btnXau.style.background = "rgba(212, 175, 55, 0.15)";
        btnXau.style.borderColor = "var(--gold)";
        btnXau.style.color = "var(--gold)";
        
        btnUs30.style.background = "rgba(255,255,255,0.05)";
        btnUs30.style.borderColor = "rgba(255,255,255,0.1)";
        btnUs30.style.color = "#a0aec0";
    } else {
        btnUs30.style.background = "rgba(212, 175, 55, 0.15)";
        btnUs30.style.borderColor = "var(--gold)";
        btnUs30.style.color = "var(--gold)";
        
        btnXau.style.background = "rgba(255,255,255,0.05)";
        btnXau.style.borderColor = "rgba(255,255,255,0.1)";
        btnXau.style.color = "#a0aec0";
    }
}

function safeExtractJSON(rawData) {
    try {
        return JSON.parse(rawData); // Try standard parse first
    } catch (e) {
        console.warn("Cleaning markdown from AI response...");
        try {
            const jsonMatch = rawData.match(/\{[\s\S]*\}/); // Extract only the JSON block
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return null;
        } catch (err) {
            console.error("Failed to extract JSON:", err);
            return null;
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const btnChartSync = document.getElementById('btn-chart-sync');

            if (btnChartSync) {
        btnChartSync.addEventListener('click', async () => {
            const savedKey = localStorage.getItem('supreme_gemini_key');

            if (!savedKey) {
                alert("Please go to the Fundamental Analysis section and connect your free Google Gemini API key first.");
                return;
            }

            // Set UI Loading State
            btnChartSync.innerHTML = `<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> Analyzing Gold...`;
            document.getElementById('smc-dashboard').style.opacity = "0.4";

            try {
        // Fetch Live Price using Twelve Data API as backup real-time feed
        let livePriceText = "$4285.00"; // Default safe fallback
        try {
            // Map symbols to Twelve Data format (XAU/USD and Dow Jones index DJ30)
            const tdSymbol = selectedAsset === 'XAUUSD' ? 'XAU/USD' : 'DJI';
            
            // Note: Twelve Data has a free tier. You can use 'demo' or drop in your free key if you register at twelvedata.com
            const tdApiKey = '312469dd3eda4f7e97d2853007361186'; 
            const priceUrl = `https://api.twelvedata.com/price?symbol=${tdSymbol}&apikey=${tdApiKey}`;
            
            const priceRes = await fetch(priceUrl);
            const priceData = await priceRes.json();
            
            if (priceData && priceData.price) {
                const actualPrice = parseFloat(priceData.price);
                if (!isNaN(actualPrice)) {
                    livePriceText = `$${actualPrice.toFixed(2)}`;
                }
            }
        } catch (e) {
            console.warn("Twelve Data fetch bypassed, using default chart baseline.");
        }

                const smcPrompt = `You are a professional trader specializing in intraday and positioning trading, focusing on high-quality setups that develop over time rather than fast-paced scalping or immediate entries. Analyze ${selectedAsset} using the live price ${livePriceText} as the current reference point.

INTRADAY TRADING PRIORITY: Prioritize setups that allow price to develop toward a meaningful intraday target over several candles or hours. Use the Daily timeframe for major directional context, H4 and H1 for trend, market structure, and key zones, M15 for setup development, and M5 only for precise entry confirmation when necessary. Do not prioritize M1 scalping or treat every short-term price movement as a trading opportunity.

Analyze Support and Resistance, Order Blocks, Fair Value Gaps, SMC, ICT, Fibonacci Golden Zone, Range and Deviation, Inducement, Threshold Levels, Opening and Closing Levels, Quasimodo Patterns, Price Action, Equal Highs and Equal Lows, previous day/week/month highs and lows, and Asia/Tokyo, London, and New York session highs and lows. Identify potential institutional and retail support/resistance areas as interpretations of price behavior, not verified positioning data unless actual positioning data is available. Specify the relevant trading session for each important level.

NO IMMEDIATE ENTRY RULE: Never recommend an immediate BUY or SELL solely because the current price is near a support, resistance, Order Block, Fair Value Gap, Fibonacci level, or liquidity zone. First determine whether the market has a valid directional context and whether price has reached a meaningful area of interest. Wait for sufficient price development and candle-close confirmation of the proposed setup. Look for a valid liquidity reaction, market structure shift or continuation, and a favorable entry relative to the structural stop loss and realistic intraday target. Do not assume that a setup is confirmed while its required conditions remain incomplete.

SETUP MATURITY: Distinguish between a developing setup, a confirmed entry opportunity, and an invalidated setup. When price is approaching a key zone but confirmation is absent, explain what price action must occur before entry and provide the relevant trigger level. When price is moving between key zones without a clear advantage, prefer waiting rather than forcing a trade. Do not chase a move after price has already traveled too far from the planned entry.

ENTRY, STOP LOSS, AND TAKE PROFIT: Provide specific price levels grounded in available market data. Choose entry levels based on confirmed structure or a clearly defined retracement, stop losses beyond genuine structural invalidation, and take profits at realistic opposing liquidity or intraday structure levels. Ensure the potential reward justifies the risk after considering spread, volatility, and execution costs where available. Keep the proposed trade relevant to the current market price, but do not force an entry near the current price when the better opportunity is still developing. If the ideal entry is farther away, provide that level and explain the required conditions.

DATA AND CONFIRMATION: Never fabricate candle closes, session levels, market structure, or confirmations that are not supported by the available data. If historical candles, timeframe data, or session information are insufficient, state the limitation in the analysis and avoid presenting an unconfirmed setup as a reliable signal. A detailed analysis or high confidence label must never substitute for actual confirmation.

Follow the existing JSON structure exactly. Keep all requested fields and their sentence-length requirements. Express uncertainty through the existing bias, confidence, and scenario conditions rather than forcing an immediate trade. The goal is to identify fewer, better-structured intraday opportunities, not to generate a BUY or SELL signal on every analysis.

Return strictly a JSON object with this structure, NO markdown formatting, NO backticks:
{
  "bias": "5 words. Determine the market bias based on multi-timeframe, BOS/CHoCH, liquidity sweeps, price action, momentum, and confluence from support/resistance, order blocks, FVGs, and Fibonacci levels; assign a strong bias only when multiple independent signals align, use Neutral / Ranging when direction is unclear, and Wait for Confirmation when a potential setup lacks a valid entry trigger.",
  "confidence": "5 words. Rate the analysis based on the alignment of multi-timeframe market structure, liquidity behavior, price action, momentum, and confluence; assign higher confidence only when multiple independent signals agree and reliable market data is available, and lower confidence when signals conflict, confirmation is missing, or data is insufficient.",
"supportResistance": "4 sentences. Identify key support and resistance zones",
"liquidityZones": "4 sentences. Identify Buy-Side Liquidity (BSL), Sell-Side Liquidity (SSL), internal/external range liquidity (IRL/ERL), and potential liquidity sweeps."
"smcInstRetail": "4 sentences detailing Institutional Price Support/Resistance and Retailers Price Resistance/Support with specific prices and corresponding session names (Asia, London, New York).",
  "smcSessions": "4 sentences detailing exact previous day and weeks Session highs and lows for Asia/Tokyo, London, and New York with specific prices",
  "smcBlocksFvg": "4 sentences, Analyze the 4H and 1H timeframes to determine the trend using confirmed market structure (HH/HL for bullish, LH/LL for bearish), identify the exact prices of key swing points, support/resistance, BOS, and CHOCH, and classify the trend as bullish, bearish, ranging, or transitioning. Confirm the overall bias using both timeframes, prioritize the 4H trend, and use the 1H to validate structure and identify potential continuation or reversal levels. Provide precise price levels for key Order Blocks, Fibonacci Golden Zone, Range & Deviation, and Threshold Levels, clearly distinguishing confirmed structure from potential scenarios and avoiding unsupported predictions.",
  "smcStructureAction": "3-4 sentences detailing Quasimodo patterns, Inducement, equal highs/lows (EQH/EQL), and price action behavior with exact price references.",
  "smcLevels": "3-4 sentences detailing Key Support and Resistance with exact price references.",
  "smcLiquidity": "3-4 sentences Liquidity Zones with exact price references.",
  "buyLot": "0.01 - 0.2 (Based on the confidence)",
  "sellLot": "0.01 - 0.2 (Based on the confidence)",
  "buyScenario": { "condition": "2 SENTENCES Setup trigger with the Execution on 5 Minutes Time Frame (WITH SPECIFIC PRICE). Be Precise and Careful with this because this is the most crucial part, give the best setup as much as you could", "entry": "Price", "sl": "Price", "tp": "Price" },
  "sellScenario": { "condition": "2 SENTENCES Setup trigger with the Execution on 5 Minutes Time Frame (WITH SPECIFIC PRICE). Be Precise and Careful with this because this is the most crucial part, give the best setup as much as you could", "entry": "Price", "sl": "Price", "tp": "Price" },
  "mtfDaily": { "trend": "1-2 words", "desc": "1 brief sentence on Monthly Time Frame Support and Resistance (BE PRECISE WITH THIS, BECAUSE THIS IS CRUCIAL)" },
  "mtfH4": { "trend": "1-2 words", "desc": "1 brief sentence on Daily Time Frame Support and Resistance (BE PRECISE WITH THIS, BECAUSE THIS IS CRUCIAL)" },
  "mtfH1": { "trend": "1-2 words", "desc": "1 brief sentence on H4 Time Frame structure Support and Resistance (BE PRECISE WITH THIS, BECAUSE THIS IS CRUCIAL)" }
}`;

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${savedKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: smcPrompt }] }],
                        generationConfig: { responseMimeType: "application/json" }
                    })
                });

                const rawData = await response.json();
                if (!response.ok) throw new Error(rawData.error?.message || "API Request Failed");

                // CRITICAL FIX: Sanitize the output to prevent JSON parse freezing
                let aiText = rawData.candidates[0].content.parts[0].text;
                aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
                
                const aiData = JSON.parse(aiText);

                // Risk Algorithm: Calculates lot size based on Stop Loss distance
                const calculateLot = (entry, sl) => {
                    const numEntry = parseFloat(String(entry).replace(/[^0-9.]/g, ''));
                    const numSl = parseFloat(String(sl).replace(/[^0-9.]/g, ''));
                    if (isNaN(numEntry) || isNaN(numSl)) return "0.01";
                    
                    const distance = Math.abs(numEntry - numSl);
                    let lot = 0.05; 
                    
                    if (distance <= 1.5) lot = 0.10;
                    else if (distance <= 3) lot = 0.08;
                    else if (distance <= 5) lot = 0.05;
                    else if (distance <= 7) lot = 0.03;
                    else lot = 0.01;
                    
                    return lot.toFixed(2);
                };

                                // Inject Data into UI Cards
                const biasEl = document.getElementById('smc-bias');
                biasEl.textContent = aiData.bias;
                biasEl.style.color = aiData.bias.includes("SLIGHTLY BULLISH, BULLISH") ? "#00C851" : aiData.bias.includes("BEARISH, SLIGHTLY BEARISH") ? "#ff4444" : "var(--gold)";

                document.getElementById('smc-confidence').textContent = `${aiData.confidence}`;

                document.getElementById('smc-inst-retail').textContent = aiData.smcInstRetail || 'No data provided.';
    document.getElementById('smc-sessions').textContent = aiData.smcSessions || 'No data provided.';
    document.getElementById('smc-blocks-fvg').textContent = aiData.smcBlocksFvg || 'No data provided.';
    document.getElementById('smc-structure-action').textContent = aiData.smcStructureAction || 'No data provided.';
                document.getElementById('smc-levels').textContent = aiData.supportResistance;
                document.getElementById('smc-liquidity').textContent = aiData.liquidityZones;

                // Buy Setup Updates
                document.getElementById('buy-scenario-text').textContent = aiData.buyScenario.condition;
                document.getElementById('buy-entry').textContent = aiData.buyScenario.entry;
                document.getElementById('buy-sl').textContent = aiData.buyScenario.sl;
                document.getElementById('buy-tp').textContent = aiData.buyScenario.tp;
                document.getElementById('buy-lot').textContent = calculateLot(aiData.buyScenario.entry, aiData.buyScenario.sl);

                // Sell Setup Updates
                document.getElementById('sell-scenario-text').textContent = aiData.sellScenario.condition;
                document.getElementById('sell-entry').textContent = aiData.sellScenario.entry;
                document.getElementById('sell-sl').textContent = aiData.sellScenario.sl;
                document.getElementById('sell-tp').textContent = aiData.sellScenario.tp;
                document.getElementById('sell-lot').textContent = calculateLot(aiData.sellScenario.entry, aiData.sellScenario.sl);
              
                // --- MULTI-TIMEFRAME STRUCTURE & BIAS UPDATES ---
    const dailyStat = document.getElementById('mtf-daily-status');
    const dailyText = document.getElementById('mtf-daily-text');
    if (dailyStat && aiData.mtfDaily) {
        dailyStat.textContent = aiData.mtfDaily.trend;
        dailyText.textContent = aiData.mtfDaily.desc;
        dailyStat.style.color = aiData.mtfDaily.trend.includes('UP') ? '#00C851' : (aiData.mtfDaily.trend.includes('DOWN') ? '#ff4444' : 'var(--gold)');
    }

    const h4Stat = document.getElementById('mtf-h4-status');
    const h4Text = document.getElementById('mtf-h4-text');
    if (h4Stat && aiData.mtfH4) {
        h4Stat.textContent = aiData.mtfH4.trend;
        h4Text.textContent = aiData.mtfH4.desc;
        h4Stat.style.color = aiData.mtfH4.trend.includes('UP') ? '#00C851' : (aiData.mtfH4.trend.includes('DOWN') ? '#ff4444' : 'var(--gold)');
    }

    const h1Stat = document.getElementById('mtf-h1-status');
    const h1Text = document.getElementById('mtf-h1-text');
    if (h1Stat && aiData.mtfH1) {
        h1Stat.textContent = aiData.mtfH1.trend;
        h1Text.textContent = aiData.mtfH1.desc;
        h1Stat.style.color = aiData.mtfH1.trend.includes('UP') ? '#00C851' : (aiData.mtfH1.trend.includes('DOWN') ? '#ff4444' : 'var(--gold)');
    }

                
            } catch (error) {
                console.error("SMC Chart Sync Error:", error);
                document.getElementById('smc-analysis-text').textContent = `Analysis failed: ${error.message}`;
            } finally {
                // Guarantee the button unfreezes, even if there is an error
                btnChartSync.innerHTML = `<i class="fas fa-check" style="margin-right: 8px;"></i> Sync Complete`;
                document.getElementById('smc-dashboard').style.opacity = "1";

                                setTimeout(() => {
                    btnChartSync.innerHTML = `<i class="fas fa-solid fa-magnifying-glass-dollar" style="margin-right: 8px;"></i> Sync Live Chart Insight`;
                }, 3000);
            }
        });
    }
});
