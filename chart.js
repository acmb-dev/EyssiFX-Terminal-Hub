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
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${savedKey}`, {
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
