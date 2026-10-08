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
        btnAnalyze.innerHTML = `<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> Syncing with Google Gemini...`;
        document.getElementById('ai-insight-cards').style.opacity = "0.4";
        document.getElementById('gold-title').textContent = "ANALYZING...";
        document.getElementById('dxy-title').textContent = "ANALYZING...";

        try {
            // Strict prompt formatting for Google Gemini
            const promptText = `You are an institutional trading AI analyzing live global macroeconomic conditions. Return strictly a JSON object formatted exactly like this, no markdown, no other text:
{"goldTitle":"BULLISH / SLIGHTLY BULLISH / NEUTRAL / SLIGHTLY BEARISH / BEARISH","goldDesc":"7 short sentence explaining why","dxyTitle":"BULLISH / SLIGHTLY BULLISH / NEUTRAL / SLIGHTLY BEARISH / BEARISH","dxyDesc":"7 short sentence explaining why","advisoryTitle":"3-5 word advice","advisoryDesc":"7 actionable sentence","fearValue":number 1-100,"fearText":"GREED or FEAR","fearDesc":"7 short sentence explanation"} What are the latest fundamental factors and events that could affect the price of gold (XAUUSD) right now? Please analyze the latest developments in the U.S. economy, Federal Reserve and interest-rate expectations, inflation, employment data, U.S. Dollar (DXY), Treasury yields, geopolitical events, central-bank gold purchases, and other major economic or global events. Explain whether each factor is potentially bullish or bearish for gold, and identify which factors are currently having the strongest influence on XAUUSD? Provide the JSON response.`;

            // Call the 100% free Gemini API endpoint
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
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
                btnAnalyze.innerHTML = `<i class="fas fa-robot" style="margin-right: 8px;"></i> Sync Live AI Market Analysis`;
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
            btnChartSync.innerHTML = `<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> Analyzing Chart...`;
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

                const smcPrompt = `You are a professional Smart Money Concepts (SMC) trader analyzing ${selectedAsset}. 
The live price is ${livePriceText}. Base all Support & Resistance, Order Blocks, Fair Value Gap, SMC, ICT, Fibonacci (Golden Zone), Range & Deviation, Inducement, Threshold Level, Opening/Close Level (varies), Quasimodo / Quasimodo Pattern, Price Action and Entry/SL/TP levels strictly around this current price. 

Return strictly a JSON object with this structure, NO markdown formatting, NO backticks:
{
  "bias": "2-4 Words",
  "confidence": "1-3 Words",
  "supportResistance": "Key support and resistance ranges",
  "liquidityZones": "Important liquidity pools",
  "smcAnalysis": "8-10 sentences explaining market structure",
  "buyScenario": { "condition": "Setup trigger", "entry": "Price", "sl": "Price", "tp": "Price" },
  "sellScenario": { "condition": "Setup trigger", "entry": "Price", "sl": "Price", "tp": "Price" }
}`;

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${savedKey}`, {
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
                document.getElementById('smc-analysis-text').textContent = aiData.smcAnalysis;
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

            } catch (error) {
                console.error("SMC Chart Sync Error:", error);
                document.getElementById('smc-analysis-text').textContent = `Analysis failed: ${error.message}`;
            } finally {
                // Guarantee the button unfreezes, even if there is an error
                btnChartSync.innerHTML = `<i class="fas fa-check" style="margin-right: 8px;"></i> Sync Complete`;
                document.getElementById('smc-dashboard').style.opacity = "1";

                                setTimeout(() => {
                    btnChartSync.innerHTML = `<i class="fas fa-robot" style="margin-right: 8px;"></i> Sync Live Chart Insight`;
                }, 3000);
            }
        });
    }
});
