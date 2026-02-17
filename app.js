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

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    // Force input box visible (Clean UI)
    const inputBox = document.getElementById('inputLinks');
    if(inputBox) inputBox.style.display = 'block';

    if(document.getElementById('todaySorted')) {
        document.getElementById('todaySorted').textContent = getTodaySorted();
    }
    loadHistory();
    
    if(document.getElementById('inputLinks')) {
        document.getElementById('inputLinks').addEventListener('input', updateStats);
    }
    
    document.getElementById('sortBtn').addEventListener('click', async () => {
        const text = document.getElementById('inputLinks').value;
        if (!text.trim()) return showToast('⚠️ আগে লিংক পেস্ট করুন!', 'warning');
        
        const overlay = document.querySelector('.fancy-overlay');
        if(overlay) {
            overlay.classList.add('active');
            await new Promise(r => setTimeout(r, 1000));
        }
        
        processLinks(); 
        
        if(overlay) {
            setTimeout(() => overlay.classList.remove('active'), 500);
        }
        showToast('সফলভাবে সাজানো হয়েছে! 🎉', 'success');
    });

    document.getElementById('resetBtn').addEventListener('click', resetAll);
    document.getElementById('pasteBtn').addEventListener('click', pasteToMain);
    document.getElementById('clearInputBtn').addEventListener('click', () => { 
        document.getElementById('inputLinks').value = ''; 
        updateStats(); 
    });
    
    document.getElementById('copyBtn').addEventListener('click', () => copyText(outputText));
    if(document.getElementById('copyPlainBtn')) document.getElementById('copyPlainBtn').addEventListener('click', () => copyText(outputText));
    if(document.getElementById('copyFBBtn')) document.getElementById('copyFBBtn').addEventListener('click', () => copyText(outputText)); 

    const popupClose = document.getElementById('popupClose');
    if(popupClose) popupClose.addEventListener('click', () => document.getElementById('popupOverlay').classList.remove('show'));
    
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if(clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearHistory);
    
    const scrollBtn = document.getElementById('scrollTopBtn');
    if(scrollBtn) {
        window.addEventListener('scroll', () => {
            if(window.scrollY > 300) scrollBtn.classList.add('show');
            else scrollBtn.classList.remove('show');
        });
        scrollBtn.addEventListener('click', () => window.scrollTo(0,0));
    }
});

// ===== 🧠 UNIVERSAL DECODER (Handles Emoji, Symbols, Fancy Fonts) =====
function unfancy(str) {
    return str.normalize('NFKD').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(char) {
        const code = char.codePointAt(0);
        
        // Handle Fancy Fonts (Bold, Italic, etc.)
        if (code >= 119808 && code <= 120831) {
            if ((code >= 120782 && code <= 120791) || (code >= 120802 && code <= 120811) || (code >= 120812 && code <= 120821) || (code >= 120822 && code <= 120831) || (code >= 120792 && code <= 120801)) { 
                 return String.fromCharCode(48 + (code % 10)); 
            }
        }
        
        // Handle Emojis & Symbols (🔗, 👉, etc.) by removing them if they are not numbers
        // We actually want to keep them generally, but specific ones between "Link" and "Number" need removal.
        // This function focuses on normalization. Removal happens in extractNumber.
        
        return char;
    }).normalize('NFKC');
}

function normalizeText(text) {
    if (!text) return '';
    let t = text;
    t = unfancy(t);
    for (let bn in BENGALI_NUMBERS) {
        t = t.replace(new RegExp(bn, 'g'), BENGALI_NUMBERS[bn]);
    }
    for (let em in EMOJI_NUMBERS) {
        t = t.split(em).join(EMOJI_NUMBERS[em]);
    }
    t = t.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ');
    return t;
}

// ===== 🔍 POWERFUL NUMBER EXTRACTION =====
function extractNumber(text) {
    if (!text) return null;
    
    // Step 1: Normalize
    let clean = normalizeText(text).substring(0, 150);
    
    // Step 2: AGGRESSIVE CLEANING
    // Remove ANY emoji, symbol, or punctuation between words
    // Keeps only Letters and Numbers and basic spaces
    // This turns "Link 🔗 147" into "Link  147" and "Link no👉139" into "Link no 139"
    
    // Regex matches any character that is NOT a letter (a-z), NOT a number (0-9), and NOT a space
    // It replaces them with a space
    clean = clean.replace(/[^a-zA-Z0-9\s]/g, ' '); 

    // Step 3: Regex for Keywords + Number
    const regex = /(?:link|post|serial|number|like|no|id|on|לינק|পোস্ট|সিরিয়াল|নং|নাম্বার)(?:\s+)?(?:no|number|num|on|নং)?(?:\s+)?(\d+)/i;
    let match = clean.match(regex);
    if (match) return parseInt(match[1]);

    // Step 4: Fallback - Start of line number
    const startMatch = clean.match(/^\s*(\d+)/);
    if (startMatch) return parseInt(startMatch[1]);
    
    return null;
}

function cleanInstruction(text) {
    if (!text) return '';
    let t = normalizeText(text); 
    
    // Remove "Link ... 147" pattern with flexible cleaning
    // We construct a regex that allows junk chars between Link and Number
    t = t.replace(/(?:link|post|serial|like|no|id|on|לינק|পোস্ট|নং)(?:[^0-9]{0,20})?\d+/gi, '');
    
    // Remove separator lines
    t = t.replace(/-{3,}/g, '')
         .replace(/<<<BLOCK_SEPARATOR>>>/g, '');
    
    // Cleanup
    t = t.replace(/^\d+\s*/gm, '') 
         .replace(/#(admin|vip|notice|mod|এডমিন|ভিআইপি|নোটিশ)\w*/gi, '') 
         .replace(/\n+/g, ' ') 
         .replace(/\s+/g, ' ') 
         .trim();

    return t;
}

// ===== MAIN PROCESSING =====
function processLinks() {
    let rawText = document.getElementById('inputLinks').value;
    let entries = [];
    
    // **SMART SPLIT LOGIC**
    let splitBlocks = [];
    if (rawText.includes('<<<BLOCK_SEPARATOR>>>')) {
        splitBlocks = rawText.split('<<<BLOCK_SEPARATOR>>>');
    } else if (rawText.match(/-{4,}/)) { 
        splitBlocks = rawText.split(/-{4,}/);
    } else {
        splitBlocks = [rawText];
    }

    splitBlocks.forEach(block => {
        if(block.trim()) entries = entries.concat(processSingleBlock(block));
    });

    if (entries.length === 0) return;

    // Separate Categories
    let regular = entries.filter(e => e.type === 'regular' && e.num !== null);
    let vip = entries.filter(e => e.type === 'vip');
    let notice = entries.filter(e => e.type === 'notice');
    let admin = entries.filter(e => e.type === 'admin');

    // Remove Duplicates
    const seen = new Set();
    regular = regular.filter(e => {
        if (seen.has(e.num)) return false;
        seen.add(e.num);
        return true;
    });

    regular.sort((a, b) => a.num - b.num);

    // Range Logic
    const startNumInput = document.getElementById('startNum').value;
    const batchNameInput = document.getElementById('batchName');
    
    let min, max;
    let finalRegularList = [];
    missingList = [];
    fbWatchList = [];

    if (startNumInput.trim() !== '') {
        let currentSerial = parseInt(startNumInput);
        regular.forEach(item => {
            if (/fb\.watch/i.test(item.url)) fbWatchList.push(currentSerial);
            finalRegularList.push({ displayNum: currentSerial, url: item.url, inst: item.inst });
            currentSerial++;
        });
        if (finalRegularList.length > 0) {
            min = finalRegularList[0].displayNum;
            max = finalRegularList[finalRegularList.length - 1].displayNum;
        } else { min = 0; max = 0; }
    } else {
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

    const detectedRange = `${min}-${max}`;
    if (!batchNameInput.value.trim() || /^\d+-\d+$/.test(batchNameInput.value.trim())) {
        batchNameInput.value = detectedRange;
    }
    
    // Output Generation
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
                if (item.inst && item.inst.trim().length > 0) result += `💬 ${item.inst}\n`;
            } else {
                result += `📌 (নেই — Skipped)\n`;
            }
            result += '\n';
            count++;
            
            const showBreaks = document.getElementById('showBreaks').checked;
            if (showBreaks && count % 10 === 0 && item.displayNum !== max) {
                result += '✨🔥 --- 🔥✨\n\n';
            }
        });
    }

    const appendSection = (title, list, icon) => {
        if (list.length) {
            result += `\n${icon}═══ ${title} ═══${icon}\n\n`;
            list.forEach((item, index) => {
                result += `⭐ ${title} ${index + 1}\n📌 ${item.url}\n`;
                if (item.inst && item.inst.trim().length > 0) result += `💬 ${item.inst}\n`;
                result += '\n';
            });
        }
    };

    appendSection('VIP Links', vip, '🏆');
    appendSection('Notice Links', notice, '📢');
    appendSection('Admin Links', admin, '👑');

    outputText = result;
    document.getElementById('outputArea').innerHTML = result;
    
    updateAlertBox();
    const total = regular.length + vip.length + notice.length + admin.length;
    updateSummary(regular.length, missingList.length);
    addTodaySorted(total);
    saveHistory({ id: Date.now(), batch: userBatchName, total, output: result, date: new Date().toLocaleString('bn-BD') });
}

// Logic to process a single string (Isolated Block)
function processSingleBlock(text) {
    const urlMatches = [...text.matchAll(/(https?:\/\/[^\s"'<>]+)/gi)];
    if (urlMatches.length === 0) return [];

    let blockEntries = [];
    
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
        }
        if (type === 'regular' && num === null) type = 'admin';

        blockEntries.push({ num, url, type, inst: cleanInstruction(rawText) });
    }
    return blockEntries;
}

// ===== UI & Stats Helpers =====
const $ = id => document.getElementById(id);

function updateStats() {
    const text = document.getElementById('inputLinks').value;
    const urls = text.match(/https?:\/\/[^\s"'<>]+/gi) || [];
    const unique = new Set(urls.map(u => u.toLowerCase()));
    
    const countEl = document.getElementById('linkCount');
    if(countEl) countEl.textContent = urls.length;
    
    const dupeEl = document.getElementById('Duplicate');
    if(dupeEl) dupeEl.textContent = urls.length - unique.size;
    
    const fbCount = (text.match(/fb\.watch/gi) || []).length;
    const fbEl = document.getElementById('fbWatchCount');
    if(fbEl) fbEl.textContent = fbCount;
}

function updateAlertBox() {
    const box = document.getElementById('alertBox');
    const textSpan = document.getElementById('alertText');
    if(!box) return;

    if (fbWatchList.length > 0) {
        box.className = 'alert show danger';
        textSpan.textContent = `⚠️ fb.watch found in ${fbWatchList.length} links!`;
    } else if (missingList.length > 0) {
        box.className = 'alert show warning';
        textSpan.textContent = `⚠️ ${missingList.length} links are missing!`;
    } else {
        box.className = 'alert show success';
        textSpan.textContent = '✅ All good!';
    }
}

function updateSummary(regCount, missCount) {
    const panel = document.getElementById('summaryPanel');
    if(!panel) return;
    panel.classList.add('show');
    document.getElementById('summaryGrid').innerHTML = `
        <div class="sum-item"><div class="val">${regCount}</div><div class="lbl">Regular</div></div>
        <div class="sum-item clickable ${missCount > 0 ? 'has-items' : ''}" onclick="showMissingPopup()"><div class="val">${missCount}</div><div class="lbl">Missing 👆</div></div>
        <div class="sum-item clickable ${fbWatchList.length > 0 ? 'has-items' : ''}" onclick="showFbPopup()"><div class="val">${fbWatchList.length}</div><div class="lbl">fb.watch 👆</div></div>
    `;
}

// ===== Popups =====
function showMissingPopup() {
    if(!missingList.length) return showToast('কোনো মিসিং লিংক নেই', 'success');
    document.getElementById('popupTitle').textContent = 'Skipped / Missing Numbers';
    document.getElementById('popupBody').innerHTML = `<div class="popup-items">${missingList.map(n => `<span class="popup-item missing">${n}</span>`).join('')}</div>`;
    document.getElementById('popupOverlay').classList.add('show');
}
function showFbPopup() {
    if(!fbWatchList.length) return showToast('fb.watch লিংক পাওয়া যায়নি', 'success');
    document.getElementById('popupTitle').textContent = 'fb.watch Found at Numbers';
    document.getElementById('popupBody').innerHTML = `<div class="popup-items">${fbWatchList.map(n => `<span class="popup-item fbwatch">${n}</span>`).join('')}</div>`;
    document.getElementById('popupOverlay').classList.add('show');
}

// ===== Toast Notification =====
function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type==='success'?'check':'info'}-circle"></i> ${msg}`;
    document.getElementById('toastBox').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ===== Utilities =====
function getTodaySorted() {
    const data = JSON.parse(localStorage.getItem('todaySorted')) || {};
    return data.date === new Date().toDateString() ? data.count : 0;
}
function addTodaySorted(c) {
    const cur = getTodaySorted();
    localStorage.setItem('todaySorted', JSON.stringify({ date: new Date().toDateString(), count: cur + c }));
    if(document.getElementById('todaySorted')) document.getElementById('todaySorted').textContent = cur + c;
}
async function pasteToMain() { 
    try { 
        document.getElementById('inputLinks').value = await navigator.clipboard.readText(); 
        updateStats(); 
    } catch(e) { showToast('Clipboard denied', 'error'); } 
}
async function copyText(txt) { 
    if(!txt) return showToast('Empty!', 'warning');
    await navigator.clipboard.writeText(txt); 
    showToast('Copied!', 'success'); 
}
function resetAll() { 
    document.getElementById('inputLinks').value = ''; 
    document.getElementById('outputArea').innerHTML = '<div class="empty"><i class="fas fa-inbox"></i><p>সাজানো লিংক এখানে দেখাবে</p></div>'; 
    outputText = ''; 
    document.getElementById('alertBox').classList.remove('show'); 
    document.getElementById('summaryPanel').classList.remove('show'); 
    document.getElementById('batchName').value = ''; 
    document.getElementById('startNum').value = ''; 
    updateStats(); 
}
function saveHistory(item) { 
    historyData.unshift(item); 
    if(historyData.length > 10) historyData.pop(); 
    localStorage.setItem('linkHistory', JSON.stringify(historyData)); 
    loadHistory(); 
}
function loadHistory() {
    const list = document.getElementById('historyList');
    if(!list) return;
    if(!historyData.length) { list.innerHTML = '<div class="no-history"><i class="fas fa-clock"></i><p>কোনো হিস্টোরি নেই</p></div>'; return; }
    list.innerHTML = historyData.map(h => `<div class="history-item" onclick="loadHistoryItem(${h.id})"><div class="batch">Batch: ${h.batch}</div><div class="meta">${h.total} links • ${h.date}</div></div>`).join('');
}
function loadHistoryItem(id) {
    const item = historyData.find(h => h.id === id);
    if(item) { outputText = item.output; document.getElementById('outputArea').innerHTML = item.output; showToast('History Loaded', 'info'); }
}
function clearHistory() { historyData = []; localStorage.removeItem('linkHistory'); loadHistory(); showToast('History cleared', 'success'); }
