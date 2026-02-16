// ===== Global Data =====
let outputText = '';
let historyData = JSON.parse(localStorage.getItem('linkHistory')) || [];
let fbWatchList = [];
let missingList = [];

// ===== Configuration =====
const EMOJIS = ['🎯', '🌟', '🌀', '🔥', '🌈', '⚡', '🌸', '💎', '🎉', '🌍', '🦋', '🌷', '🌺', '🌼', '🍂', '🍁', '🪷', '🌙', '☁️', '🫧'];
const LABELS = ['Post No', 'Serial No', 'Count', 'Link', 'Memo No', 'Case No', 'Receipt No', 'Booking No', 'Ticket No', 'Doc No'];

// ===== Bengali & Emoji Map =====
const BENGALI_NUMBERS = {'০':'0', '১':'1', '২':'2', '৩':'3', '৪':'4', '৫':'5', '৬':'6', '৭':'7', '৮':'8', '৯':'9'};
const EMOJI_NUMBERS = {
    '0️⃣': '0', '1️⃣': '1', '2️⃣': '2', '3️⃣': '3', '4️⃣': '4',
    '5️⃣': '5', '6️⃣': '6', '7️⃣': '7', '8️⃣': '8', '9️⃣': '9', '🔟': '10'
};

// ===== 🎨 FANCY CSS STYLES =====
const style = document.createElement('style');
style.innerHTML = `
    .fancy-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(8px); z-index: 10000; display: flex; justify-content: center; align-items: center; opacity: 0; visibility: hidden; transition: all 0.4s ease; }
    .fancy-overlay.active { opacity: 1; visibility: visible; }
    .fancy-card { background: white; padding: 40px; border-radius: 25px; box-shadow: 0 20px 50px rgba(0,0,0,0.3); text-align: center; transform: scale(0.8); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); max-width: 300px; width: 90%; }
    .fancy-overlay.active .fancy-card { transform: scale(1); }
    .fancy-loader { width: 60px; height: 60px; border: 5px solid #f3f3f3; border-top: 5px solid #6c5ce7; border-right: 5px solid #00cec9; border-bottom: 5px solid #fd79a8; border-radius: 50%; margin: 0 auto 20px; animation: fancySpin 1s linear infinite; }
    .checkmark-circle { width: 70px; height: 70px; background: #00b894; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 20px rgba(0, 184, 148, 0.4); animation: popIn 0.5s ease forwards; }
    .checkmark { width: 20px; height: 35px; border: solid white; border-width: 0 5px 5px 0; transform: rotate(45deg); margin-top: -5px; }
    .fancy-text { font-family: 'Poppins', sans-serif; font-size: 18px; font-weight: 600; color: #2d3436; }
    @keyframes fancySpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @keyframes popIn { 0% { transform: scale(0); } 80% { transform: scale(1.1); } 100% { transform: scale(1); } }
`;
if(!document.getElementById('dynamic-styles')) {
    style.id = 'dynamic-styles';
    document.head.appendChild(style);
}

const overlay = document.createElement('div');
overlay.className = 'fancy-overlay';
overlay.innerHTML = `<div class="fancy-card"><div class="fancy-loader"></div><div class="fancy-text">Checking Links...</div></div>`;
document.body.appendChild(overlay);

// ===== DOM Elements =====
const $ = id => document.getElementById(id);

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    if($('todaySorted')) $('todaySorted').textContent = getTodaySorted();
    loadHistory();
    $('inputLinks').addEventListener('input', updateStats);
    
    $('sortBtn').addEventListener('click', async () => {
        const text = $('inputLinks').value;
        if (!text.trim()) return showToast('⚠️ আগে লিংক পেস্ট করুন!', 'warning');
        
        // Show Animation
        const card = overlay.querySelector('.fancy-card');
        card.innerHTML = `<div class="fancy-loader"></div><div class="fancy-text">সাজানো হচ্ছে... 🌀</div>`;
        overlay.classList.add('active');
        
        await new Promise(r => setTimeout(r, 1500)); // 1.5s Delay
        
        processLinks(); // Run Logic
        
        card.innerHTML = `<div class="checkmark-circle"><div class="checkmark"></div></div><div class="fancy-text">সফলভাবে সাজানো হয়েছে! 🎉</div>`;
        setTimeout(() => overlay.classList.remove('active'), 1500);
    });

    $('resetBtn').addEventListener('click', resetAll);
    $('pasteBtn').addEventListener('click', pasteText);
    $('clearInputBtn').addEventListener('click', () => { $('inputLinks').value = ''; updateStats(); });
    
    // Copy Buttons
    $('copyBtn').addEventListener('click', () => copyText(outputText));
    $('copyPlainBtn').addEventListener('click', () => copyText(outputText));
    $('copyFBBtn').addEventListener('click', () => copyText(outputText)); 

    $('popupClose').addEventListener('click', () => $('popupOverlay').classList.remove('show'));
    $('clearHistoryBtn').addEventListener('click', clearHistory);
    
    // Scroll Top
    window.addEventListener('scroll', () => {
        if(window.scrollY > 300) $('scrollTopBtn').classList.add('show');
        else $('scrollTopBtn').classList.remove('show');
    });
    $('scrollTopBtn').addEventListener('click', () => window.scrollTo(0,0));
});

// ===== 🧠 UNIVERSAL FANCY FONT DECODER =====
// This function handles ALL types of fancy fonts (Bold, Italic, Script, Double-struck, etc.)
function unfancy(str) {
    return str.normalize('NFKD').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(char) {
        const code = char.codePointAt(0);
        
        // Mathematical Alphanumeric Symbols range (A-Z, a-z, 0-9 in various styles)
        if (code >= 119808 && code <= 120831) {
            // Calculate offset to ASCII
            // This covers Bold, Italic, Bold-Italic, Script, Bold-Script, Fraktur, 
            // Double-Struck, Sans-Serif, Sans-Serif Bold, Monospace
            
            // Numbers 0-9
            if ((code >= 120782 && code <= 120791) || // Bold 0-9
                (code >= 120802 && code <= 120811) || // Double-Struck 0-9
                (code >= 120812 && code <= 120821) || // Sans-Serif 0-9
                (code >= 120822 && code <= 120831) || // Sans Bold 0-9
                (code >= 120792 && code <= 120801)) { // Monospace 0-9
                 return String.fromCharCode(48 + (code % 10)); // 48 is ASCII '0'
            }
            
            // Letters are more complex due to gaps in Unicode, 
            // but for detecting "Link No", normalization often handles the letters.
            // We focus heavily on numbers here.
        }
        return char;
    }).normalize('NFKC'); // Re-normalize to standard text
}

function normalizeText(text) {
    if (!text) return '';
    let t = text;

    // 1. Unfancy (Fancy Fonts -> Normal Text)
    t = unfancy(t);

    // 2. Bengali Numbers (০-৯ -> 0-9)
    for (let bn in BENGALI_NUMBERS) {
        t = t.replace(new RegExp(bn, 'g'), BENGALI_NUMBERS[bn]);
    }
    
    // 3. Emoji Numbers
    for (let em in EMOJI_NUMBERS) {
        t = t.split(em).join(EMOJI_NUMBERS[em]);
    }

    return t;
}

function extractNumber(text) {
    if (!text) return null;
    
    // Step 1: Normalization
    let clean = normalizeText(text).substring(0, 150);
    
    // Step 2: Remove separators to merge "Link : 43" to "Link 43"
    clean = clean.replace(/[:\-_=,|.]/g, " ");

    // Step 3: Keyword based detection (Strongest)
    // Matches: Link 43, Post 43, Serial 43, No 43
    const regex = /(?:link|post|serial|like|no|id|লিংক|পোস্ট|সিরিয়াল|নং|নাম্বার)(?:\s+)?(?:no|নং|নাম্বার)?(?:\s+)?(\d+)/i;
    let match = clean.match(regex);
    if (match) return parseInt(match[1]);

    // Step 4: Fallback - Start of line number (Medium)
    // Matches: "43 . some text" or "43"
    const startMatch = clean.match(/^\s*(\d+)/);
    if (startMatch) return parseInt(startMatch[1]);
    
    // Step 5: Last Resort - Any standalone number (Weak but catches "Good Link 43")
    // Only if text is short (avoid picking phone numbers or dates from long text)
    if(clean.length < 50) {
        const anyNum = clean.match(/(\d+)/);
        if(anyNum) return parseInt(anyNum[1]);
    }

    return null;
}

function cleanInstruction(text) {
    if (!text) return '';
    
    let t = normalizeText(text); // Unfancy first
    
    // Remove the Link/Number identifier parts
    t = t.replace(/(?:link|post|serial|like|no|id|লিংক|পোস্ট|সিরিয়াল|নং|নাম্বার)(?:[^0-9]{0,30})?\d+/gi, '')
         .replace(/^\d+\s*/gm, '') // Remove starting numbers
         .replace(/[:\-_]/g, ' ')  // Remove separators
         .replace(/#(admin|vip|notice|mod|এডমিন|ভিআইপি|নোটিশ)\w*/gi, '') // Remove tags
         .replace(/\n+/g, ' ') // Flatten newlines
         .trim();

    return t;
}

// ===== MAIN PROCESSING =====
function processLinks() {
    const text = $('inputLinks').value;
    const urlMatches = [...text.matchAll(/(https?:\/\/[^\s"'<>]+)/gi)];

    if (urlMatches.length === 0) return;

    let entries = [];
    let lastFound = null;

    // 1. Scan and Extract
    for (let i = 0; i < urlMatches.length; i++) {
        const url = urlMatches[i][1];
        const prevEnd = i === 0 ? 0 : urlMatches[i - 1].index + urlMatches[i - 1][0].length;
        const rawText = text.substring(prevEnd, urlMatches[i].index);
        
        let type = 'regular';
        let normText = normalizeText(rawText); 
        
        if (/#vip|#ভিআইপি/i.test(normText)) type = 'vip';
        else if (/#notice|#নোটিশ/i.test(normText)) type = 'notice';
        else if (/#admin|#এডমিন|#mod/i.test(normText)) type = 'admin';

        let num = null;
        if (type === 'regular') {
            num = extractNumber(rawText);
            
            // Smart Sequence Fix:
            // If we didn't find a number, BUT we have a previous number,
            // AND the raw text doesn't look like a completely new distinct header (long text),
            // Assume it's the next number.
            if (num === null && lastFound !== null && rawText.length < 200) {
                num = lastFound + 1;
            }
            if (num !== null) lastFound = num;
        }
        
        if (type === 'regular' && num === null) type = 'admin';

        entries.push({ num, url, type, inst: cleanInstruction(rawText) });
    }

    // 2. Separate Categories
    let regular = entries.filter(e => e.type === 'regular' && e.num !== null);
    let vip = entries.filter(e => e.type === 'vip');
    let notice = entries.filter(e => e.type === 'notice');
    let admin = entries.filter(e => e.type === 'admin');

    // // Remove Duplicates & Track them
    const seen = new Set();
    const duplicates = [];

    regular = regular.filter(e => {
        if (seen.has(e.num)) {
            duplicates.push(e.num); // ডুপ্লিকেট নাম্বারটি লিস্টে রাখছে
            return false;
        }
        seen.add(e.num);
        return true;
    });

    // ডুপ্লিকেট পাওয়া গেলে অ্যালার্ট ও পপআপ দেখাবে
    if (duplicates.length > 0) {
        const uniqueDups = [...new Set(duplicates)];
        showToast(`⚠️ ডুপ্লিকেট সিরিয়াল: ${uniqueDups.join(', ')}`, 'warning');
        
        // ডুপ্লিকেট ডিটেইল পপআপ ফাংশন কল
        showDuplicatePopup(uniqueDups);
    }


    // Sort by Original Number
    regular.sort((a, b) => a.num - b.num);

    // 3. Handle Start No & Batch Name
    const startNumInput = $('startNum').value;
    const batchNameInput = $('batchName');
    
    let min, max;
    let finalRegularList = [];
    
    missingList = [];
    fbWatchList = [];

    if (startNumInput.trim() !== '') {
        // --- RE-NUMBERING MODE ---
        let currentSerial = parseInt(startNumInput);
        regular.forEach(item => {
            if (/fb\.watch/i.test(item.url)) fbWatchList.push(currentSerial);
            
            finalRegularList.push({
                displayNum: currentSerial,
                url: item.url,
                inst: item.inst
            });
            currentSerial++;
        });
        
        if (finalRegularList.length > 0) {
            min = finalRegularList[0].displayNum;
            max = finalRegularList[finalRegularList.length - 1].displayNum;
        } else { min = 0; max = 0; }
    } else {
        // --- ORIGINAL NUMBER MODE ---
        if (regular.length > 0) {
            min = regular[0].num;
            max = regular[regular.length - 1].num;
            const linkMap = new Map(regular.map(e => [e.num, e]));
            
            for (let i = min; i <= max; i++) {
                const item = linkMap.get(i);
                if (item) {
                    if (/fb\.watch/i.test(item.url)) fbWatchList.push(i);
                    finalRegularList.push({ displayNum: i, url: item.url, inst: item.inst });
                } else {
                    missingList.push(i);
                    finalRegularList.push({ displayNum: i, url: null, inst: null });
                }
            }
        } else { min = 0; max = 0; }
    }

    // 4. Update Batch Name Input
    const detectedRange = `${min}-${max}`;
    if (!batchNameInput.value.trim() || /^\d+-\d+$/.test(batchNameInput.value.trim())) {
        batchNameInput.value = detectedRange;
    }
    
    // 5. Build Output String
    let result = '';
    const userBatchName = batchNameInput.value.trim() || detectedRange;
    
    if (finalRegularList.length > 0 || missingList.length > 0) {
        result += `Batch: ${userBatchName}\n\n`;
        let count = 0;

        finalRegularList.forEach(item => {
            const emoji = EMOJIS[count % EMOJIS.length];
            const label = LABELS[count % LABELS.length];
            
            result += `${emoji} ${label}: ${item.displayNum}\n`;

            if (item.url) {
                result += `📌 ${item.url}\n`;
                // INSTRUCTION FIX: Only show if exists
                if (item.inst && item.inst.trim().length > 0) {
                     result += `💬 ${item.inst}\n`;
                }
            } else {
                result += `📌 (নেই — Skipped)\n`;
            }
            result += '\n';
            count++;

            // Break Logic
            if ($('showBreaks').checked && count % 10 === 0 && item.displayNum !== max) {
                result += '✨🔥 --- 🔥✨\n\n';
            }
        });
    }

    // Append Specials
    const appendSection = (title, list, icon) => {
        if (list.length) {
            result += `\n${icon}═══ ${title} ═══${icon}\n\n`;
            list.forEach((item, index) => {
                result += `⭐ ${title} ${index + 1}\n📌 ${item.url}\n`;
                if (item.inst && item.inst.trim().length > 0) {
                    result += `💬 ${item.inst}\n`;
                }
                result += '\n';
            });
        }
    };

    appendSection('VIP Links', vip, '🏆');
    appendSection('Notice Links', notice, '📢');
    appendSection('Admin Links', admin, '👑');

    // UI Updates
    outputText = result;
    $('outputArea').innerHTML = result;
    
    updateAlertBox();
    const total = regular.length + vip.length + notice.length + admin.length;
    updateSummary(regular.length, missingList.length);
    addTodaySorted(total);
    saveHistory({ id: Date.now(), batch: userBatchName, total, output: result, date: new Date().toLocaleString('bn-BD') });
}

// ===== UI & Stats Helpers =====
function updateStats() {
    const text = $('inputLinks').value;
    const urls = text.match(/https?:\/\/[^\s"'<>]+/gi) || [];
    const unique = new Set(urls.map(u => u.toLowerCase()));
    
    $('linkCount').textContent = urls.length;
    $('Duplicate').textContent = urls.length - unique.size;
    
    const fbCount = (text.match(/fb\.watch/gi) || []).length;
    $('fbWatchCount').textContent = fbCount;
}

function updateAlertBox() {
    const box = $('alertBox');
    if (fbWatchList.length > 0) {
        box.className = 'alert show danger';
        $('alertText').textContent = `⚠️ fb.watch found in ${fbWatchList.length} links (Check Summary)`;
    } else if (missingList.length > 0) {
        box.className = 'alert show warning';
        $('alertText').textContent = `⚠️ ${missingList.length} links are missing in sequence!`;
    } else {
        box.className = 'alert show success';
        $('alertText').textContent = '✅ All good! No fb.watch or missing links.';
    }
}

function updateSummary(regCount, missCount) {
    const panel = $('summaryPanel');
    panel.classList.add('show');
    $('summaryGrid').innerHTML = `
        <div class="sum-item"><div class="val">${regCount}</div><div class="lbl">Regular</div></div>
        <div class="sum-item clickable ${missCount > 0 ? 'has-items' : ''}" onclick="showMissingPopup()"><div class="val">${missCount}</div><div class="lbl">Missing 👆</div></div>
        <div class="sum-item clickable ${fbWatchList.length > 0 ? 'has-items' : ''}" onclick="showFbPopup()"><div class="val">${fbWatchList.length}</div><div class="lbl">fb.watch 👆</div></div>
    `;
}

// ===== Popups =====
function showMissingPopup() {
    if(!missingList.length) return showToast('কোনো মিসিং লিংক নেই', 'success');
    $('popupTitle').textContent = 'Skipped / Missing Numbers';
    $('popupBody').innerHTML = `<div class="popup-items">${missingList.map(n => `<span class="popup-item missing">${n}</span>`).join('')}</div><div class="popup-count">Total: ${missingList.length}</div>`;
    $('popupOverlay').classList.add('show');
}
function showFbPopup() {
    if(!fbWatchList.length) return showToast('fb.watch লিংক পাওয়া যায়নি', 'success');
    $('popupTitle').textContent = 'fb.watch Found at Numbers';
    $('popupBody').innerHTML = `<div class="popup-items">${fbWatchList.map(n => `<span class="popup-item fbwatch">${n}</span>`).join('')}</div><div class="popup-count">Total: ${fbWatchList.length}</div>`;
    $('popupOverlay').classList.add('show');
}

// ===== Toast Notification =====
function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = type === 'success' ? `<i class="fas fa-check-circle"></i> ${msg}` : `<i class="fas fa-exclamation-circle"></i> ${msg}`;
    $('toastBox').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
function showDuplicatePopup(dupList) {
    if (!$('popupOverlay')) return; // সেফটি চেক
    
    $('popupTitle').textContent = 'Duplicate Serial Numbers';
    $('popupBody').innerHTML = `
        <div class="popup-items">
            ${dupList.map(n => `<span class="popup-item" style="background: #ffeaa7; color: #d63031; border: 1px solid #fab1a0;">${n}</span>`).join('')}
        </div>
        <div class="popup-count" style="color: #d63031; font-weight: bold; margin-top: 10px;">
            সিস্টেম অটোমেটিক ডুপ্লিকেট লিংকগুলো বাদ দিয়েছে।
        </div>
    `;
    $('popupOverlay').classList.add('show');
}

// ===== Utilities =====
function getTodaySorted() {
    const data = JSON.parse(localStorage.getItem('todaySorted')) || {};
    return data.date === new Date().toDateString() ? data.count : 0;
}
function addTodaySorted(c) {
    const cur = getTodaySorted();
    localStorage.setItem('todaySorted', JSON.stringify({ date: new Date().toDateString(), count: cur + c }));
    if($('todaySorted')) $('todaySorted').textContent = cur + c;
}
async function pasteText() { try { $('inputLinks').value = await navigator.clipboard.readText(); updateStats(); } catch(e) { showToast('Clipboard access denied', 'error'); } }
async function copyText(txt) { 
    if(!txt) return showToast('কপি করার মতো কিছু নেই', 'warning');
    await navigator.clipboard.writeText(txt); 
    showToast('সফলভাবে কপি হয়েছে!', 'success'); 
}
function resetAll() { 
    $('inputLinks').value = ''; 
    $('outputArea').innerHTML = '<div class="empty"><i class="fas fa-inbox"></i><p>সাজানো লিংক এখানে দেখাবে</p></div>'; 
    outputText = ''; 
    $('alertBox').classList.remove('show'); 
    $('summaryPanel').classList.remove('show'); 
    $('batchName').value = ''; 
    $('startNum').value = ''; 
    updateStats(); 
}
function saveHistory(item) { 
    historyData.unshift(item); 
    if(historyData.length > 10) historyData.pop(); 
    localStorage.setItem('linkHistory', JSON.stringify(historyData)); 
    loadHistory(); 
}
function loadHistory() {
    const list = $('historyList');
    if(!historyData.length) { list.innerHTML = '<div class="no-history"><i class="fas fa-clock"></i><p>কোনো হিস্টোরি নেই</p></div>'; return; }
    list.innerHTML = historyData.map(h => `<div class="history-item" onclick="loadHistoryItem(${h.id})"><div class="batch">Batch: ${h.batch}</div><div class="meta">${h.total} links • ${h.date}</div></div>`).join('');
}
function loadHistoryItem(id) {
    const item = historyData.find(h => h.id === id);
    if(item) { 
        outputText = item.output; 
        $('outputArea').innerHTML = item.output; 
        showToast('History Loaded', 'info');
    }
}
function clearHistory() { historyData = []; localStorage.removeItem('linkHistory'); loadHistory(); showToast('History cleared', 'success'); }
