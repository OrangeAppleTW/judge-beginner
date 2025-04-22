// --- Global Scope Variables ---
let problemConfig = null; // Will hold the dynamically loaded problem configuration
let currentLanguage = 'python'; // Default language
let editorCodes = { python: '', javascript: '' }; // Will be populated after config load
let pyodide = null;
let pyodideReady = false;
let capturedStdout = "";
let capturedStderr = "";
let eventListenersAttached = false; // Flag to prevent duplicate listeners

// --- DOM Element References ---
const mainTitle = document.getElementById('main-title');
const descContentDiv = document.getElementById('desc-content');
const inputFormatContentDiv = document.getElementById('input-format-content');
const outputFormatContentDiv = document.getElementById('output-format-content');
const examplesContentDiv = document.getElementById('examples-content');
const hintsContentDiv = document.getElementById('hints-content');
const userCodeTextarea = document.getElementById('user-code');
const runButton = document.getElementById('run-button');
const runButtonText = document.getElementById('run-button-text');
const outputDiv = document.getElementById('output');
let initialOutputMessage = document.getElementById('initial-output-message');
const resetCodeBtn = document.getElementById('reset-code');
const saveCodeBtn = document.getElementById('save-code');
const exportCodeBtn = document.getElementById('export-code');
const switchEditorBtn = document.getElementById('switch-editor-btn');
const editorTitle = document.getElementById('editor-title');
const shortcutsHelp = document.getElementById('shortcuts-help');
const closeHelpBtn = document.getElementById('close-help');
const importCodeBtn = document.getElementById('import-code');
const fileInput = document.getElementById('file-input');
const loadExampleBtn = document.getElementById('load-example-btn');
const viewPincodeBtn = document.getElementById('view-pincode-btn');
const shareProblemBtn = document.getElementById('share-problem-btn'); // <-- 新增: 分享按鈕
const infoModal = document.getElementById('info-modal');             // <-- 修改: 通用 Modal
const closeInfoModalBtn = document.getElementById('close-info-modal-btn'); // <-- 修改: 通用關閉按鈕
const modalTitle = document.getElementById('modal-title');             // <-- 新增: Modal 標題
const modalDescription = document.getElementById('modal-description');   // <-- 新增: Modal 描述
const modalContentDisplay = document.getElementById('modal-content-display'); // <-- 修改: Modal 內容顯示
const copyContentBtn = document.getElementById('copy-content-btn');       // <-- 修改: 通用複製按鈕
// --- End DOM References ---

// --- Helper Functions ---
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        try {
            if (unsafe === undefined) return "undefined";
            if (unsafe === null) return "null";
            unsafe = String(unsafe);
        } catch (e) {
            return "[無法轉換為字串]";
        }
    }
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showNotification(message, duration = 3000) {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        document.body.removeChild(existingNotification);
    }
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    void notification.offsetWidth;
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, duration);
}
// --- End Helper Functions ---


// --- Dynamic Data Loading (Hash-Based Routing) ---
function parseHash() {
    const hash = location.hash;
    const problemPrefix = '#/problem/';
    let problemId = null;
    let urlPincode = null;
    let embed = null; // <-- 新增: embed 參數

    const hashParts = hash.split('?');
    const pathPart = hashParts[0]; // e.g., #/problem/ID

    if (pathPart.startsWith(problemPrefix)) {
        problemId = pathPart.substring(problemPrefix.length);
    }

    if (hashParts.length > 1) {
        const searchParams = new URLSearchParams(hashParts[1]);
        urlPincode = searchParams.get('pincode'); // Get pincode as string or null
        embed = searchParams.get('embed'); // <-- 新增: 取得 embed 參數
    }

    // console.log(`Parsed hash: problemId=${problemId}, urlPincode=${urlPincode}, embed=${embed}`); // Debug log
    return { problemId, urlPincode, embed }; // <-- 新增: 回傳 embed
}


async function loadProblemData(problemId) { // Accept problemId as argument
    try {
        // const problemId = getProblemIdFromHash(); // Removed: problemId is now passed in
        if (!problemId) {
            throw new Error("無法從 URL Hash (#) 中找到有效的題目 ID (格式應為 #/problem/ID)。請檢查網址，或提供一個預設頁面。");
        }
        const jsonPath = `./data/${problemId}.json`;
        console.log(`Loading problem data for ID ${problemId}, using path: ${jsonPath}`); // Updated log
        const response = await fetch(jsonPath);
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`找不到題目設定檔： ${jsonPath} (錯誤 404)。請確認檔案路徑和 ID (${problemId}) 是否正確。`);
            } else {
                throw new Error(`載入題目設定檔 '${jsonPath}' 失敗：伺服器回應 ${response.status} ${response.statusText}`);
            }
        }
        const data = await response.json();
        if (!data || typeof data !== 'object' || !data.title) {
            console.warn("Loaded JSON data seems incomplete or invalid:", data);
        }
        console.log("題目資料載入成功:", data);
        return data;
    } catch (error) {
        console.error("載入題目資料 (loadProblemData) 時發生錯誤:", error);
        throw error;
    }
}
// --- End Dynamic Data Loading ---
async function loadAndDisplayProblemFromHash(problemId, shouldLoadExample) { // Renamed parameter
    try {
        problemConfig = await loadProblemData(problemId); // Pass problemId to loadProblemData
        displayProblem(problemConfig);
        loadCodesFromLocalStorage(shouldLoadExample); // Pass shouldLoadExample to loadCodes
        updateEditorUI();
    } catch (error) {
        console.error(`載入並顯示題目 (ID: ${problemId}, LoadExample: ${shouldLoadExample}) 時發生錯誤:`, error); // Updated log
    }
}




async function showProblemListView() {
    document.title = "題目列表"; // Set page title for list view
    const sections = document.querySelectorAll('.container > section.card');
    sections.forEach(sec => {
        sec.id === 'problem-list-view' ? sec.style.display = 'block' : sec.style.display = 'none';
    });
    const searchParams = new URLSearchParams(location.hash.split('?')[1]);
    // const pincode = searchParams.get('pincode');
    // document.getElementById('pincode-message').style.display = (pincode === '123456') ? 'none' : 'block';
    const listUl = document.getElementById('problem-list');
    listUl.innerHTML = '';
    try {
        const resp = await fetch('data/problems.json');
        let problems = await resp.json();
        // Sort problems by order, defaulting to 0 if order is missing
        problems.sort((a, b) => (a.order || 0) - (b.order || 0));
        for (const { id, title, description } of problems) { // <-- 新增讀取 description
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `#/problem/${id}`;
            a.textContent = title;
            li.appendChild(a);

            // --- 新增的部分 ---
            if (description) { // 檢查 description 是否存在
                const p = document.createElement('p');
                p.textContent = description;
                p.className = 'problem-list-description'; // 加上 class 以便未來調整樣式
                li.appendChild(p); // 將描述段落加到列表項目中
            }
            // --- 結束新增的部分 ---

            listUl.appendChild(li);
        }
    } catch (err) {
        console.error('Error loading problems index', err);
    }
}

async function handleRoute() {
    const hash = location.hash;
    if (hash.startsWith('#/problems')) {
        // --- 新增: 確保在列表頁隱藏分享按鈕 ---
        if (shareProblemBtn) {
            shareProblemBtn.style.display = 'none';
        }
        // --- 結束新增 ---
        await showProblemListView();
    } else if (hash.startsWith('#/problem/')) { // Check if it's a problem detail route
        const { problemId, urlPincode, embed } = parseHash(); // <-- 修改: 取得 embed

        if (problemId) {
            let shouldLoadExample = false;
            try {
                // Fetch the problems index to get the correct pincode
                const resp = await fetch('data/problems.json');
                const problems = await resp.json();
                const problemInfo = problems.find(p => p.id === problemId);

                if (problemInfo && problemInfo.pincode !== undefined && urlPincode !== null) {
                    // Compare pincode from URL (string) with pincode from JSON (might be number)
                    if (String(urlPincode) === String(problemInfo.pincode)) {
                        shouldLoadExample = true;
                        console.log(`Pincode match for ${problemId}. Loading example code.`);
                    } else {
                        console.log(`Pincode mismatch for ${problemId}. URL: ${urlPincode}, Expected: ${problemInfo.pincode}. Loading default/saved code.`);
                        // Optionally show a notification for wrong pincode?
                        // showNotification("提供的 Pincode 不正確。");
                    }
                } else {
                     console.log(`Pincode check not applicable for ${problemId} (missing info or URL pincode). Loading default/saved code.`);
                }
            } catch (err) {
                console.error('Error fetching or processing problems.json for pincode check:', err);
                // Default to not loading example code on error
            }

            // --- Button Visibility Control ---
            const isEmbedded = embed === 'true'; // Check if embedded

            if (loadExampleBtn) {
                loadExampleBtn.style.display = shouldLoadExample ? 'none' : 'inline-flex';
            }
            if (viewPincodeBtn) {
                // Show view pincode button only if pincode is correct
                viewPincodeBtn.style.display = shouldLoadExample ? 'inline-flex' : 'none';
            }

            // Hide specific buttons if embedded
            const buttonsToHideWhenEmbedded = [shareProblemBtn, saveCodeBtn, importCodeBtn, exportCodeBtn];
            buttonsToHideWhenEmbedded.forEach(btn => {
                if (btn) { // Check if button element exists
                    btn.style.display = isEmbedded ? 'none' : 'inline-flex'; // Hide if embedded, show otherwise
                }
            });
            // --- End Button Visibility Control ---


            // Show problem detail view
            const sections = document.querySelectorAll('.container > section.card');
            sections.forEach(sec => {
                sec.id === 'problem-list-view' ? sec.style.display = 'none' : sec.style.display = 'block';
            });
            // Pass problemId and the result of the pincode check
            await loadAndDisplayProblemFromHash(problemId, shouldLoadExample);
        } else {
            // Handle invalid problem hash (e.g., #/problem/ but no ID or invalid format)
            console.error("Invalid or incomplete problem hash:", hash);
            // Optionally redirect to list view or show an error message
        await showProblemListView(); // Default to list view for now
    }
} else {
    // Handle other hashes or no hash (optional, could default to list view)
    console.log("Unhandled hash:", hash, "Defaulting to problem list view.");
    // Ensure buttons are hidden if not on a problem page
    if (loadExampleBtn) loadExampleBtn.style.display = 'none';
    if (viewPincodeBtn) viewPincodeBtn.style.display = 'none';
    // --- 新增: 確保在其他頁面隱藏分享按鈕 ---
    if (shareProblemBtn) {
        shareProblemBtn.style.display = 'none';
    }
    // --- 結束新增 ---
    await showProblemListView();
}
}

// --- Display Logic ---
function displayProblem(config) {
    if (!config) {
        console.error("displayProblem 呼叫時未提供設定檔");
        mainTitle.textContent = "錯誤";
        descContentDiv.innerHTML = "<p>無法顯示題目內容，因為設定檔無效。</p>";
        return;
    }
    mainTitle.textContent = config.title || "未命名題目";
    document.title = config.title + "｜橘子蘋果程式學苑" || "程式解題";

    const renderArrayAsList = (itemsArray) => {
        if (!Array.isArray(itemsArray) || itemsArray.length === 0) return '<p>此題沒有相關說明</p>';
        const listHTML = `<ul>${itemsArray.map(item => `<li>${item}</li>`).join('')}</ul>`;
        return listHTML;
    };

    if (descContentDiv) {
        descContentDiv.innerHTML = config.descriptionContentHTML || '<p><em>(無題目描述)</em></p>';
    }
    if (inputFormatContentDiv) {
        inputFormatContentDiv.innerHTML = renderArrayAsList(config.inputFormat);
    }
    if (outputFormatContentDiv) {
        outputFormatContentDiv.innerHTML = renderArrayAsList(config.outputFormat);
    }
    if (hintsContentDiv) {
        hintsContentDiv.innerHTML = renderArrayAsList(config.hints);
    }

    if (examplesContentDiv && Array.isArray(config.examples) && config.examples.length > 0) {
        const examplesHTML = config.examples.map((example, index) => {
            const input = example.input;
            const output = example.output;
            const explanation = example.explanation || "";
            const inputHTML = Array.isArray(input)
                ? input.map(inputItem => `<pre><code>${escapeHtml(inputItem)}</code></pre>`).join('')
                : `<pre><code>輸入格式錯誤 (Example ${index + 1})</code></pre>`;
            const outputHTML = Array.isArray(output)
                ? output.map(outputItem => `<pre><code>${escapeHtml(outputItem)}</code></pre>`).join('')
                : `<pre><code>輸出格式錯誤 (Example ${index + 1})</code></pre>`;
            const explanationHTML = explanation ? `<div class="example-explanation"><strong>解釋：</strong> ${escapeHtml(explanation)}</div>` : '';
            return `
                <div class="example-row">
                    <div class="example-input-section"><strong>輸入：</strong>${inputHTML}</div>
                    <div class="example-output-section"><strong>預期輸出：</strong>${outputHTML}</div>
                    ${explanationHTML}
                </div>`;
        }).join('');
        examplesContentDiv.innerHTML = examplesHTML;
    } else if (examplesContentDiv) {
        examplesContentDiv.innerHTML = '<p><em>(無執行範例)</em></p>';
    }

    if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
        setTimeout(() => {
            const elementsToTypeset = [
                descContentDiv, inputFormatContentDiv, outputFormatContentDiv,
                hintsContentDiv, examplesContentDiv
            ].filter(el => el);
            if (elementsToTypeset.length > 0) {
                console.log("Requesting MathJax typesetting for:", elementsToTypeset);
                window.MathJax.typesetPromise(elementsToTypeset)
                    .catch((err) => console.error('MathJax typesetting failed:', err));
            }
        }, 0);
    }
}
// --- End Display Logic ---

// --- Code Storage ---
function saveCodesToLocalStorage() {
    if (!problemConfig) {
        showNotification("錯誤：題目設定尚未載入，無法儲存。");
        return;
    }
    if (userCodeTextarea) { // Ensure textarea exists before accessing value
        editorCodes[currentLanguage] = userCodeTextarea.value;
    } else {
        console.error("Cannot save code, textarea element not found.");
        showNotification("儲存失敗：找不到編輯器。");
        return;
    }

    const storageKey = `savedCodes_${problemConfig.title || 'unknownProblem'}`;
    try {
        localStorage.setItem(storageKey, JSON.stringify(editorCodes));
        showNotification('已儲存於瀏覽器中，需要永久保存請點擊匯出。');
    } catch (e) {
        console.error("Error saving codes to localStorage:", e);
        showNotification(`儲存程式碼失敗！(${e.name})`);
    }
}

function loadCodesFromLocalStorage(shouldLoadExample = false) { // Renamed parameter
    if (!problemConfig) {
        console.warn("Problem config not loaded yet, cannot load codes.");
        editorCodes.python = '';
        editorCodes.javascript = '';
        if(userCodeTextarea) userCodeTextarea.value = '';
        return;
    }

    if (shouldLoadExample) { // Use renamed parameter
        // Load example code directly from config
        editorCodes.python = problemConfig.examplePythonCode || '# 範例 Python 程式碼未提供';
        editorCodes.javascript = problemConfig.exampleCode || '// 範例 JavaScript 程式碼未提供';
        console.log(`載入範例程式碼 (shouldLoadExample=true)。`);
        // Do NOT load from localStorage when loading examples based on pincode
    } else {
        // Load default code first
        editorCodes.python = problemConfig.defaultPythonCode || '# 請在此輸入 Python 程式碼';
        editorCodes.javascript = problemConfig.defaultCode || '// 請在此輸入 JavaScript 程式碼';

        // Try loading saved code from localStorage
        const storageKey = `savedCodes_${problemConfig.title || 'unknownProblem'}`;
        const savedData = localStorage.getItem(storageKey);

        if (savedData) {
            try {
                const loadedCodes = JSON.parse(savedData);
                if (typeof loadedCodes.python === 'string') {
                    editorCodes.python = loadedCodes.python;
                }
                if (typeof loadedCodes.javascript === 'string') {
                    editorCodes.javascript = loadedCodes.javascript;
                }
                console.log(`從 LocalStorage (${storageKey}) 載入使用者儲存的程式碼成功。`);
            } catch (e) {
                console.error(`Error parsing saved codes from localStorage (${storageKey}):`, e);
                showNotification("讀取儲存的程式碼時發生錯誤，已載入預設程式碼。");
                // Keep default codes loaded in case of error
            }
        } else {
            console.log(`LocalStorage 中沒有找到 ${storageKey} 的程式碼，使用預設程式碼。`);
        }
    }

    // Update the textarea with the determined code for the current language
    if(userCodeTextarea) {
        userCodeTextarea.value = editorCodes[currentLanguage];
    }
}
// --- End Code Storage ---


// --- Editor UI and Switching ---
function updateEditorUI() {
    // Ensure all elements exist before proceeding
    if (!userCodeTextarea || !editorTitle || !switchEditorBtn || !resetCodeBtn || !importCodeBtn || !exportCodeBtn || !runButton || !runButtonText) {
        console.warn("updateEditorUI called before all required DOM elements were ready.");
        return;
    }

    const isPython = currentLanguage === 'python';
    editorTitle.textContent = isPython ? 'Python' : 'JavaScript';
    switchEditorBtn.innerHTML = isPython
        ? '<i class="fas fa-exchange-alt"></i> 切換為 JavaScript'
        : '<i class="fas fa-exchange-alt"></i> 切換為 Python';
    userCodeTextarea.dataset.language = currentLanguage;
    userCodeTextarea.setAttribute('aria-label', `${isPython ? 'Python' : 'JavaScript'} Code Editor`);

    // Update tooltips
    resetCodeBtn.title = `重置 ${isPython ? 'Python' : 'JavaScript'} 程式碼 (Ctrl+Shift+R)`;
    importCodeBtn.title = `從檔案匯入 ${isPython ? 'Python' : 'JavaScript'} 程式碼`;
    exportCodeBtn.title = `將目前的 ${isPython ? 'Python' : 'JavaScript'} 程式碼匯出為檔案`;

    // --- Centralized Button State Management ---
    const configLoaded = !!problemConfig;
    const canRunPython = isPython && pyodideReady && configLoaded;
    const canRunJs = !isPython && configLoaded;
    const canRun = canRunPython || canRunJs;

    // <--- LATEST MODIFICATION: Centralized state management for all buttons --->
    runButton.disabled = !canRun;
    resetCodeBtn.disabled = !configLoaded;
    saveCodeBtn.disabled = !configLoaded;
    exportCodeBtn.disabled = !configLoaded;
    importCodeBtn.disabled = !configLoaded;
    switchEditorBtn.disabled = !configLoaded;
    // Removed loadExampleBtn and viewPincodeBtn disabled state management here, handled by display style in handleRoute
    // <--- End Modification --->

    // Update Run Button Text and Title based on state
    if (canRun) {
        runButtonText.textContent = '執行程式碼';
        runButton.title = `執行 ${isPython ? 'Python' : 'JavaScript'} 程式碼 (Ctrl+Enter)`;
    } else if (!configLoaded) {
        runButtonText.textContent = '載入題目中...';
        runButton.title = '題目設定載入中...';
    } else if (isPython && !pyodideReady) {
        runButtonText.textContent = '載入執行環境...';
        runButton.title = 'Python 執行環境 (Pyodide) 載入中...';
    } else {
        // Should not happen if logic is correct, but acts as a fallback
        runButtonText.textContent = '無法執行';
        runButton.title = '執行條件未滿足';
    }

    // Update Initial Output Message based on state
    // Re-fetch initial message element in case it was replaced
    const currentInitialMsg = document.getElementById('initial-output-message');
    if (currentInitialMsg && outputDiv.contains(currentInitialMsg)) {
         initialOutputMessage = currentInitialMsg; // Update reference just in case
         if (!configLoaded) {
            initialOutputMessage.innerHTML = `<i class="fas fa-book"></i> 等待題目資料載入...`;
            initialOutputMessage.className = 'result-loading';
        } else if (isPython && !pyodideReady) {
            initialOutputMessage.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 正在準備 Python 執行環境 (Pyodide)...`;
            initialOutputMessage.className = 'result-loading loading';
        } else { // Config loaded, and (JS selected OR Python selected and ready)
            initialOutputMessage.innerHTML = `<i class="fas fa-info-circle"></i> 請編輯 ${isPython ? 'Python' : 'JavaScript'} 程式碼後點擊「執行程式碼」查看結果`;
            initialOutputMessage.className = 'result-loading'; // Ensure no error/loading class
        }
    } else {
        // If the initial message is gone, don't try to update it
        console.warn("Initial output message element not found or not in outputDiv.");
    }
}

function switchEditor(targetLanguage = null) {
    const nextLanguage = targetLanguage ?? (currentLanguage === 'python' ? 'javascript' : 'python');
    if (nextLanguage === currentLanguage) return;

    if (problemConfig && userCodeTextarea) { // Save current code only if config loaded and textarea exists
        editorCodes[currentLanguage] = userCodeTextarea.value;
    }

    currentLanguage = nextLanguage;

    if (userCodeTextarea) { // Update textarea only if it exists
        userCodeTextarea.value = editorCodes[currentLanguage];
    }

    updateEditorUI(); // Update all UI elements including button states and initial message

    if (userCodeTextarea) {
        userCodeTextarea.focus();
    }

    // Reset output area only if results are currently shown
    const currentInitialMsg = document.getElementById('initial-output-message');
    if (!currentInitialMsg && outputDiv && outputDiv.innerHTML.trim() !== '') {
         // If there are results, clear them and show the initial prompt
         outputDiv.innerHTML = `<div class="result-loading" id="initial-output-message"></div>`;
         initialOutputMessage = document.getElementById('initial-output-message'); // Get new reference
         updateEditorUI(); // Set the correct initial message via updateEditorUI
     }
}
// --- End Editor UI and Switching ---


// --- Code Execution ---

// --- Formatting Helpers for Results ---
function formatValueForPlaintextPre(value) {
    let displayValue;
    if (typeof value === 'string') {
        displayValue = value;
    } else if (value === null || value === undefined) {
        displayValue = String(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
        displayValue = String(value);
    } else {
        try {
            displayValue = JSON.stringify(value, null, 2);
        } catch (e) {
            try { displayValue = String(value); } catch (e2) { displayValue = "[無法序列化的值]"; }
        }
    }
    return `<pre><code>${escapeHtml(displayValue)}</code></pre>`;
}

function formatInputArrayForPre(inputArray) {
    if (!Array.isArray(inputArray)) {
        return formatValueForPlaintextPre(inputArray);
    }
    if (inputArray.length === 0) {
        return '<pre><code>(無輸入參數)</code></pre>';
    }
    return inputArray.map(item =>
        formatValueForPlaintextPre(item)
    ).join('');
}
// --- End Formatting Helpers ---

// --- Accordion Logic ---
function addAccordionLogic(containerElement) {
    if (!containerElement) {
        console.warn("addAccordionLogic called with null container.");
        return;
    }

    containerElement.addEventListener('click', function(event) {
        const header = event.target.closest('.collapsible-header');
        if (!header) return;
        const testCaseElement = header.closest('.test-case');
        if (!testCaseElement) return;
        const detailsElement = testCaseElement.querySelector('.collapsible-content');
        if (!detailsElement) return;

        const isCollapsed = testCaseElement.classList.toggle('collapsed');
        header.setAttribute('aria-expanded', !isCollapsed);

        if (isCollapsed) {
            detailsElement.style.maxHeight = '0';
            detailsElement.style.paddingTop = '0';
            detailsElement.style.paddingBottom = '0';
            detailsElement.style.borderTopWidth = '0';
            detailsElement.style.marginTop = '0';
            detailsElement.style.marginBottom = '0';
        } else {
            detailsElement.style.paddingTop = '';
            detailsElement.style.paddingBottom = '';
            detailsElement.style.borderTopWidth = '';
            detailsElement.style.marginTop = '';
            detailsElement.style.marginBottom = '';
            detailsElement.style.maxHeight = detailsElement.scrollHeight + 'px';
            detailsElement.addEventListener('transitionend', () => {
                if (!testCaseElement.classList.contains('collapsed')) {
                    detailsElement.style.maxHeight = 'none';
                }
            }, { once: true });
        }
    });

    containerElement.addEventListener('keydown', function(event) {
        if ((event.key === 'Enter' || event.key === ' ') && event.target.classList.contains('collapsible-header')) {
            event.preventDefault();
            event.target.click();
        }
    });

    containerElement.querySelectorAll('.test-case:not(.collapsed) .collapsible-content').forEach(content => {
        content.style.maxHeight = 'none';
        const scrollHeight = content.scrollHeight;
        content.style.maxHeight = scrollHeight + 'px';
    });
    containerElement.querySelectorAll('.test-case.collapsed .collapsible-content').forEach(content => {
        content.style.maxHeight = '0';
        content.style.paddingTop = '0';
        content.style.paddingBottom = '0';
        content.style.borderTopWidth = '0';
        content.style.marginTop = '0';
        content.style.marginBottom = '0';
    });
}
// --- End Accordion Logic ---


// --- Run JavaScript Code ---
function runJavaScriptCode() {
    if (!problemConfig || !userCodeTextarea) {
        showNotification("錯誤：題目設定或編輯器尚未載入，無法執行。");
        return;
    }
    const userCode = userCodeTextarea.value;
    if (!outputDiv) { console.error("Output div not found!"); return; }
    outputDiv.innerHTML = `<div class="result-loading loading"><i class="fas fa-spinner fa-spin"></i> 執行 JavaScript 中...</div>`;
    if(runButton) runButton.disabled = true;

    setTimeout(() => {
        let userFunction;
        let overallStatusClass = ''; let overallMessage = ''; let resultsHTML = '';
        let allPassed = true; let hasError = false; let testCasesHTML = '';
        const jsFunctionName = problemConfig.functionName || 'main';

        try {
            let fnWrapper;
            try {
                fnWrapper = new Function(`"use strict"; ${userCode}\nif (typeof ${jsFunctionName} === 'function') { return ${jsFunctionName}; } else { const err = new Error('語法錯誤或找不到名為 "${jsFunctionName}" 的函數定義。'); err.name = 'FunctionDefinitionError'; throw err; }`);
                userFunction = fnWrapper();
            } catch (definitionError) {
                console.error("JavaScript Function Definition/Syntax Error:", definitionError);
                throw definitionError;
            }

            testCasesHTML = problemConfig.testCases.map((testCase, index) => {
                let statusClass = 'fail'; let statusText = '未通過'; let statusIcon = '<i class="fas fa-times"></i>';
                let actualOutput = ''; let outputDetail = '';
                let startTime = performance.now(); let executionTime = 0; let caseError = null;
                const originalConsoleLog = console.log; let capturedLogs = [];
                console.log = (...args) => { capturedLogs.push(args.map(String).join(' ')); };

                try {
                    const clonedInput = testCase.input ? JSON.parse(JSON.stringify(testCase.input)) : [];
                    userFunction(...clonedInput);
                    executionTime = (performance.now() - startTime).toFixed(2);
                    actualOutput = capturedLogs.join('\n');
                    if (actualOutput === testCase.expectedOutput) {
                        statusClass = 'pass'; statusText = '通過'; statusIcon = '<i class="fas fa-check"></i>';
                    } else {
                        allPassed = false;
                        console.log(`JS Mismatch (Case ${index+1}):\nExpected: "${testCase.expectedOutput}"\nActual:   "${actualOutput}"`);
                    }
                    outputDetail = `<strong>本次輸入</strong>${formatInputArrayForPre(testCase.input)}<strong>預期輸出</strong>${formatValueForPlaintextPre(testCase.expectedOutput)}<strong>實際輸出</strong>${formatValueForPlaintextPre(actualOutput)}`;
                } catch (runtimeError) {
                    executionTime = (performance.now() - startTime).toFixed(2);
                    statusClass = 'error'; statusText = '執行錯誤'; statusIcon = '<i class="fas fa-exclamation-triangle"></i>';
                    allPassed = false; hasError = true; caseError = runtimeError;
                    outputDetail = `<strong>本次輸入</strong>${formatInputArrayForPre(testCase.input)}<strong>錯誤訊息</strong><pre class="error-message"><code>${escapeHtml(runtimeError.message)}\n${runtimeError.stack ? escapeHtml(runtimeError.stack.split('\n').slice(0, 8).join('\n') + '\n...') : '(無堆疊資訊)'}</code></pre>`;
                    console.error(`JS Test Case ${index + 1} Runtime Error:`, runtimeError);
                } finally {
                    console.log = originalConsoleLog;
                }

                const initialCollapseState = (statusClass === 'pass') ? 'collapsed' : '';
                const isExpanded = initialCollapseState === '';
                return `<div class="test-case ${initialCollapseState}"> <div class="test-header collapsible-header" role="button" tabindex="0" aria-expanded="${isExpanded}" aria-controls="details-js-${index}"> <div class="test-title"><span>測試案例 ${index + 1}</span><span class="status ${statusClass}">${statusIcon} ${statusText}</span></div> <div class="test-info"><span class="execution-time"><i class="fas fa-clock"></i> ${executionTime} ms</span><i class="fas fa-chevron-down collapsible-icon" aria-hidden="true"></i></div> </div> <div class="details collapsible-content" id="details-js-${index}" role="region">${outputDetail}</div> </div>`;
            }).join('');

            if (allPassed) {
                overallStatusClass = 'overall-pass'; overallMessage = '<i class="fas fa-check-circle"></i> 恭喜！所有 JavaScript 測試案例通過！';
            } else if (hasError) {
                overallStatusClass = 'overall-error'; overallMessage = '<i class="fas fa-exclamation-triangle"></i> 部分 JavaScript 測試案例執行期間發生錯誤。';
            } else {
                overallStatusClass = 'overall-fail'; overallMessage = '<i class="fas fa-times-circle"></i> 部分 JavaScript 測試案例未通過。';
            }
            resultsHTML = `<div class="overall-summary ${overallStatusClass}">${overallMessage}</div><div class="test-cases-container">${testCasesHTML}</div>`;

        } catch (compileOrDefinitionError) {
            overallStatusClass = 'overall-error';
            overallMessage = compileOrDefinitionError.name === 'FunctionDefinitionError' ? `<i class="fas fa-exclamation-triangle"></i> ${escapeHtml(compileOrDefinitionError.message)}` : '<i class="fas fa-exclamation-triangle"></i> JavaScript 程式碼編譯或語法錯誤';
            hasError = true;
            resultsHTML = `<div class="overall-summary ${overallStatusClass}">${overallMessage}</div> <div class="test-cases-container"> <div class="test-case"> <div class="details" style="padding: 15px 20px; max-height: none; background-color: rgba(255, 209, 102, 0.05);"> <strong>錯誤詳情：</strong> <pre class="error-message"><code>${escapeHtml(compileOrDefinitionError.message)}\n${compileOrDefinitionError.stack ? escapeHtml(compileOrDefinitionError.stack) : ''}</code></pre> </div> </div> </div>`;
            console.error("JS Compile/Definition Error:", compileOrDefinitionError);
        } finally {
            // Re-enable run button, managed by updateEditorUI after execution potentially
             updateEditorUI(); // Call updateEditorUI to reset button states correctly
        }

        if (outputDiv) {
            outputDiv.innerHTML = resultsHTML;
            addAccordionLogic(outputDiv.querySelector('.test-cases-container'));
        }
    }, 50);
}
// --- End Run JavaScript Code ---


// --- Run Python Code ---
async function runPythonCode() {
    if (!problemConfig || !userCodeTextarea) {
        showNotification("錯誤：題目設定或編輯器尚未載入，無法執行 Python。");
        return;
    }
    if (!pyodideReady || !pyodide) {
        showNotification("Python 執行環境 (Pyodide) 尚未就緒或載入失敗。");
        if(outputDiv) outputDiv.innerHTML = `<div class="result-loading error"><i class="fas fa-times-circle"></i> Pyodide 未載入，無法執行 Python。</div>`;
        return;
    }

    const userCode = userCodeTextarea.value;
    if (!outputDiv) { console.error("Output div not found!"); return; }
    outputDiv.innerHTML = `<div class="result-loading loading"><i class="fas fa-spinner fa-spin"></i> 執行 Python 中...</div>`;
    if(runButton) runButton.disabled = true;

    await new Promise(resolve => setTimeout(resolve, 50));

    let overallStatusClass = ''; let overallMessage = ''; let resultsHTML = '';
    let allPassed = true; let hasError = false; let testCasesHTML_Array = [];
    const pyFunctionName = problemConfig.pythonFunctionName || 'main';

    try {
        try {
            await pyodide.runPythonAsync(userCode);
            console.log("Python syntax check passed (or no immediate errors).");
        } catch(syntaxCheckError) {
            if (syntaxCheckError.name === 'PythonError' && (syntaxCheckError.message.includes('SyntaxError:') || syntaxCheckError.message.includes('IndentationError:'))) {
                console.error("Python Syntax Check Error:", syntaxCheckError);
                const formattedError = syntaxCheckError.message.split('\n').map(line => escapeHtml(line)).join('<br>');
                throw new Error(`Python 語法或縮排錯誤:<br><pre class="error-message" style="text-align: left; white-space: pre-wrap; margin-top: 5px; padding: 5px; background: #fff0f0;"><code>${formattedError}</code></pre>`);
            }
            console.warn("Initial Python code check failed, but potentially not a syntax error, proceeding with test cases:", syntaxCheckError);
        }

        for (const [index, testCase] of problemConfig.testCases.entries()) {
            let statusClass = 'fail'; let statusText = '未通過'; let statusIcon = '<i class="fas fa-times"></i>';
            let actualOutput = ''; let errorOutput = ''; let outputDetail = '';
            let startTime = performance.now(); let executionTime = 0; let caseError = null;
            capturedStdout = ""; capturedStderr = "";

            try {
                let argsRepr = '()';
                if (testCase.input && Array.isArray(testCase.input)) {
                    const argsList = testCase.input.map(arg => { try { return JSON.stringify(arg); } catch (e) { console.error("Error representing input argument for Python:", arg, e); return 'None'; } });
                    argsRepr = `(${argsList.join(', ')}${argsList.length === 1 ? ',' : ''})`;
                }
                const codeToRun = `import sys, traceback\n${userCode}\ntry:\n    ${pyFunctionName}${argsRepr}\nexcept Exception as e:\n    traceback.print_exc(file=sys.stderr)`;
                await pyodide.runPythonAsync(codeToRun);
                executionTime = (performance.now() - startTime).toFixed(2);
                actualOutput = capturedStdout; errorOutput = capturedStderr;
                if (actualOutput.endsWith('\n')) actualOutput = actualOutput.slice(0, -1);
                errorOutput = errorOutput.trimEnd();

                if (errorOutput) {
                    statusClass = 'error'; statusText = '執行錯誤'; statusIcon = '<i class="fas fa-exclamation-triangle"></i>';
                    allPassed = false; hasError = true;
                    outputDetail = `<strong>本次輸入</strong>${formatInputArrayForPre(testCase.input)}<strong>預期輸出</strong>${formatValueForPlaintextPre(testCase.expectedOutput)}<strong>實際輸出</strong>${formatValueForPlaintextPre(actualOutput)}<strong style="color: var(--danger-color); display: block; margin-top: 10px;">標準錯誤輸出 (stderr)：</strong><pre class="error-message"><code>${escapeHtml(errorOutput)}</code></pre>`;
                    console.error(`Python Case ${index + 1} Stderr Captured:\n`, capturedStderr);
                } else if (actualOutput === testCase.expectedOutput) {
                    statusClass = 'pass'; statusText = '通過'; statusIcon = '<i class="fas fa-check"></i>';
                    outputDetail = `<strong>本次輸入</strong>${formatInputArrayForPre(testCase.input)}<strong>預期輸出</strong>${formatValueForPlaintextPre(testCase.expectedOutput)}<strong>實際輸出</strong>${formatValueForPlaintextPre(actualOutput)}`;
                } else {
                    allPassed = false; statusClass = 'fail'; statusText = '未通過'; statusIcon = '<i class="fas fa-times"></i>';
                    outputDetail = `<strong>本次輸入</strong>${formatInputArrayForPre(testCase.input)}<strong>預期輸出</strong>${formatValueForPlaintextPre(testCase.expectedOutput)}<strong>實際輸出</strong>${formatValueForPlaintextPre(actualOutput)}`;
                    console.log(`Python Mismatch (Case ${index+1}):\nExpected: "${testCase.expectedOutput}" (Length: ${testCase.expectedOutput ? testCase.expectedOutput.length : 0})\nActual:   "${actualOutput}" (Length: ${actualOutput.length})`);
                }
            } catch (runPythonError) {
                executionTime = (performance.now() - startTime).toFixed(2);
                statusClass = 'error'; statusText = '執行錯誤'; statusIcon = '<i class="fas fa-exclamation-triangle"></i>';
                allPassed = false; hasError = true; caseError = runPythonError;
                errorOutput = capturedStderr.trimEnd();
                let errorMessage = runPythonError.message || "未知 Pyodide 執行錯誤";
                if (runPythonError.name === 'PythonError' && runPythonError.message) errorMessage = runPythonError.message.split('\n').map(line => escapeHtml(line)).join('<br>');
                else if (runPythonError.stack) errorMessage = escapeHtml(runPythonError.stack.split('\n').slice(0, 8).join('\n') + '\n...');
                else errorMessage = escapeHtml(errorMessage);
                let detailedErrorMessage = `<pre class="error-message"><code>${errorMessage}</code></pre>`;
                if (errorOutput && !errorMessage.includes(errorOutput.split('\n')[0])) detailedErrorMessage += `<strong style="color: var(--danger-color); display:block; margin-top:10px;">標準錯誤輸出 (stderr)：</strong><pre class="error-message"><code>${escapeHtml(errorOutput)}</code></pre>`;
                outputDetail = `<strong>本次輸入</strong>${formatInputArrayForPre(testCase.input)}<strong>錯誤訊息:</strong>${detailedErrorMessage}`;
                console.error(`[Py Case ${index + 1}] Pyodide Runtime Error:`, runPythonError);
                console.error(`[Py Case ${index + 1}] Captured Stderr:\n`, capturedStderr);
            }

            const initialCollapseState = (statusClass === 'pass') ? 'collapsed' : '';
            const isExpanded = initialCollapseState === '';
            const caseHTML = `<div class="test-case ${initialCollapseState}"> <div class="test-header collapsible-header" role="button" tabindex="0" aria-expanded="${isExpanded}" aria-controls="details-py-${index}"> <div class="test-title"><span>測試案例 ${index + 1}</span><span class="status ${statusClass}">${statusIcon} ${statusText}</span></div> <div class="test-info"><span class="execution-time"><i class="fas fa-clock"></i> ${executionTime} ms</span><i class="fas fa-chevron-down collapsible-icon" aria-hidden="true"></i></div> </div> <div class="details collapsible-content" id="details-py-${index}" role="region">${outputDetail}</div> </div>`;
            testCasesHTML_Array.push(caseHTML);
        }

        const testCasesHTML = testCasesHTML_Array.join('');
        if (allPassed) { overallStatusClass = 'overall-pass'; overallMessage = '<i class="fas fa-check-circle"></i> 恭喜！所有 Python 測試案例通過！'; }
        else if (hasError) { overallStatusClass = 'overall-error'; overallMessage = '<i class="fas fa-exclamation-triangle"></i> 部分 Python 測試案例執行期間發生錯誤。'; }
        else { overallStatusClass = 'overall-fail'; overallMessage = '<i class="fas fa-times-circle"></i> 部分 Python 測試案例未通過。'; }
        resultsHTML = `<div class="overall-summary ${overallStatusClass}">${overallMessage}</div> <div class="test-cases-container">${testCasesHTML}</div>`;
    } catch (compileOrSetupError) {
        overallStatusClass = 'overall-error';
        overallMessage = `<i class="fas fa-exclamation-triangle"></i> ${compileOrSetupError.message || "Python 程式碼編譯或設定錯誤"}`;
        hasError = true;
        resultsHTML = `<div class="overall-summary ${overallStatusClass}">${overallMessage}</div> <div class="test-cases-container"></div>`;
        console.error("Python Compile/Setup Error:", compileOrSetupError);
    } finally {
         // Re-enable run button, managed by updateEditorUI after execution potentially
         updateEditorUI(); // Call updateEditorUI to reset button states correctly
    }

    if (outputDiv) {
        outputDiv.innerHTML = resultsHTML;
        addAccordionLogic(outputDiv.querySelector('.test-cases-container'));
    }
}
// --- End Run Python Code ---


// --- Pyodide Initialization ---
async function initializePyodide() {
    console.log("Initializing Pyodide...");
    // Update initial message immediately
     const initialMsgEl = document.getElementById('initial-output-message');
     if (initialMsgEl) {
         initialMsgEl.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 正在準備 Python 執行環境 (Pyodide)...`;
         initialMsgEl.className = 'result-loading loading';
     } else if (outputDiv) { // Fallback if somehow missing initially
         outputDiv.innerHTML = `<div class="result-loading loading" id="initial-output-message"><i class="fas fa-spinner fa-spin"></i> 正在準備 Python 執行環境 (Pyodide)...</div>`;
         initialOutputMessage = document.getElementById('initial-output-message'); // Re-assign global ref
     }

    try {
        pyodide = await loadPyodide({
            // indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/", // Optional: specify Pyodide source URL
            stdout: (text) => { capturedStdout += text + "\n"; },
            stderr: (text) => { capturedStderr += text + "\n"; }
        });
        console.log("Pyodide initialized successfully.");
        pyodideReady = true;
    } catch (error) {
        console.error("Failed to initialize Pyodide:", error);
        pyodideReady = false;
        // Update initial message area to show error
        const errorMsgEl = document.getElementById('initial-output-message');
        if (errorMsgEl) {
             errorMsgEl.innerHTML = `<i class="fas fa-times-circle"></i> 無法載入 Python 執行環境 (Pyodide)。請檢查網路連線或瀏覽器主控台取得詳細資訊。`;
             errorMsgEl.className = 'result-loading error';
         } else if (outputDiv) { // Fallback
             outputDiv.innerHTML = `<div class="result-loading error" id="initial-output-message"><i class="fas fa-times-circle"></i> 無法載入 Python 執行環境 (Pyodide)。</div>`;
             initialOutputMessage = document.getElementById('initial-output-message'); // Re-assign global ref
         }
        // Update run button text/title immediately on failure (though updateEditorUI will also do it)
        if (runButtonText) runButtonText.textContent = '環境載入失敗';
        if (runButton) runButton.title = 'Pyodide 載入失敗，無法執行 Python';
    } finally {
        // Update UI elements (like button states, initial message) AFTER Pyodide attempt finishes
        updateEditorUI();
    }
}
// --- End Pyodide Initialization ---


// --- Event Listeners Setup ---
function setupEventListeners() {
    // Check flag at the beginning to prevent attaching listeners multiple times
    if (eventListenersAttached) {
        // console.warn("setupEventListeners called more than once. Skipping redundant listener attachment."); // Keep commented unless debugging
        return;
    }

    // Ensure essential buttons exist
    const essentialButtons = [runButton, resetCodeBtn, saveCodeBtn, exportCodeBtn, importCodeBtn, switchEditorBtn];
    if (essentialButtons.some(btn => !btn)) {
        console.error("One or more essential buttons not found during event listener setup. Listeners not attached.");
        return; // Stop if essential buttons are missing
    }
    // Check optional buttons/modal elements and log warnings if missing
    if (!loadExampleBtn) console.warn("Load Example button (load-example-btn) not found.");
    if (!viewPincodeBtn) console.warn("View Pincode button (view-pincode-btn) not found.");
    if (!shareProblemBtn) console.warn("Share Problem button (share-problem-btn) not found."); // <-- 新增檢查
    if (!infoModal) console.warn("Info modal (info-modal) not found."); // <-- 修改檢查
    if (!closeInfoModalBtn) console.warn("Close info modal button (close-info-modal-btn) not found."); // <-- 修改檢查
    if (!modalTitle) console.warn("Modal title (modal-title) not found."); // <-- 新增檢查
    if (!modalDescription) console.warn("Modal description (modal-description) not found."); // <-- 新增檢查
    if (!modalContentDisplay) console.warn("Modal content display (modal-content-display) not found."); // <-- 修改檢查
    if (!copyContentBtn) console.warn("Copy content button (copy-content-btn) not found."); // <-- 修改檢查


    // <--- LATEST MODIFICATION: Removed button state setting logic from here --->
    // Button states are now handled centrally in updateEditorUI

    // --- Attach Listeners ---

    // Run Button
    runButton.addEventListener('click', async () => {
        if (!problemConfig) { showNotification("題目尚未載入完成。"); return; }
        if (currentLanguage === 'javascript') {
            runJavaScriptCode();
        } else if (currentLanguage === 'python') {
            if (!pyodideReady) {
                showNotification("Python 執行環境仍在準備中，請稍候。");
                return;
            }
            await runPythonCode();
        } else {
            showNotification("未知的編輯器語言。");
        }
    });

    // Switch Editor Button
    switchEditorBtn.addEventListener('click', () => switchEditor());

    // Reset Code Button
    resetCodeBtn.addEventListener('click', () => {
        if (!problemConfig || !userCodeTextarea) { showNotification("題目尚未載入完成或找不到編輯器。"); return; }
        const langName = currentLanguage === 'python' ? 'Python' : 'JavaScript';
        if (confirm(`確定要重置目前的 ${langName} 程式碼嗎？編輯器中的內容將會遺失。`)) {
            const defaultCode = currentLanguage === 'python'
                ? (problemConfig.defaultPythonCode || '# Default Python code')
                : (problemConfig.defaultCode || '// Default JavaScript code');
            userCodeTextarea.value = defaultCode;
            editorCodes[currentLanguage] = defaultCode;
            saveCodesToLocalStorage(); // Save the reset state
            showNotification(`${langName} 程式碼已重置！`);
            userCodeTextarea.focus();
            // Reset output area by clearing results and showing the initial prompt via updateEditorUI
             const currentInitialMsg = document.getElementById('initial-output-message');
             if (!currentInitialMsg && outputDiv && outputDiv.innerHTML.trim() !== '') {
                 outputDiv.innerHTML = `<div class="result-loading" id="initial-output-message"></div>`;
                 initialOutputMessage = document.getElementById('initial-output-message');
             }
            updateEditorUI(); // Refresh UI, including the initial message in output area
        }
    });

    // Save Code Button
    saveCodeBtn.addEventListener('click', saveCodesToLocalStorage);

    // Export Code Button
    exportCodeBtn.addEventListener('click', () => {
        if (!problemConfig || !userCodeTextarea) { showNotification("無法匯出：題目或編輯器尚未準備好。"); return; }
        const code = userCodeTextarea.value;
        const language = currentLanguage;
        const safeTitle = problemConfig.title ? problemConfig.title.replace(/[\\/:*?"<>|.\s]/g, '_') : 'untitled';
        const filename = `${safeTitle}.${language === 'python' ? 'py' : 'js'}`;
        const mimeType = 'text/plain;charset=utf-8';
        const blob = new Blob([code], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url; anchor.download = filename;
        document.body.appendChild(anchor); anchor.click(); document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
        showNotification(`已匯出為 ${filename}`);
    });

    // Import Code Button & File Input
    importCodeBtn.addEventListener('click', () => {
        if (!problemConfig) { showNotification("題目尚未載入完成，無法匯入。"); return; }
        if (fileInput) { fileInput.click(); }
        else { console.error("File input element not found."); }
    });

    if (fileInput) {
        fileInput.addEventListener('change', (event) => {
            if (!event.target.files || event.target.files.length === 0 || !problemConfig || !userCodeTextarea) {
                if (fileInput) fileInput.value = ''; // Reset input if no file, config not ready, or textarea missing
                return;
            }
            const file = event.target.files[0];
            const fileName = file.name;
            const fileExtension = fileName.split('.').pop().toLowerCase();
            let targetLanguage = null;

            if (fileExtension === 'py') targetLanguage = 'python';
            else if (fileExtension === 'js') targetLanguage = 'javascript';
            else if (fileExtension === 'txt') {
                targetLanguage = currentLanguage;
                showNotification(`匯入 TXT 檔案 (${fileName})，將載入至目前的 ${currentLanguage === 'python' ? 'Python' : 'JavaScript'} 編輯器`);
            } else {
                showNotification(`不支援的檔案類型：.${fileExtension}。請選擇 .py, .js 或 .txt 檔案。`);
                fileInput.value = ''; return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                if (targetLanguage !== currentLanguage) { switchEditor(targetLanguage); }
                userCodeTextarea.value = content;
                editorCodes[currentLanguage] = content;
                saveCodesToLocalStorage(); // Optional: save imported code immediately
                showNotification(`已從 ${fileName} 匯入 ${currentLanguage === 'python' ? 'Python' : 'JavaScript'} 程式碼！`);
                fileInput.value = ''; // IMPORTANT: Reset input
            };
            reader.onerror = (e) => { console.error("File reading error:", e); showNotification("讀取檔案時發生錯誤。"); fileInput.value = ''; };
            reader.readAsText(file);
        });
    } else { console.error("File input element not found, import functionality disabled."); }

    // Load Example Button Listener (Prompt for pincode)
    if (loadExampleBtn) {
        loadExampleBtn.addEventListener('click', async () => {
            const { problemId: currentProblemIdFromHash } = parseHash();
            if (!currentProblemIdFromHash) {
                 showNotification("錯誤：無法從目前網址取得題目 ID。");
                 console.error("Could not parse problem ID from hash in loadExampleBtn handler.");
                 return;
            }

             const inputPincode = prompt("請向老師詢問密碼並填入。");
             if (inputPincode === null) return; // User cancelled

            try {
                const resp = await fetch('data/problems.json');
                if (!resp.ok) throw new Error(`無法讀取 problems.json: ${resp.statusText}`);
                const problems = await resp.json();
                const problemInfo = problems.find(p => p.id === currentProblemIdFromHash);

                if (problemInfo && problemInfo.pincode !== undefined) {
                    const correctPincode = String(problemInfo.pincode);
                    if (inputPincode.trim() === correctPincode) {
                        // --- MODIFICATION START: Preserve embed=true on pincode success ---
                        const { embed: currentEmbedStatus } = parseHash(); // Get current embed status
                        let targetHash = `#/problem/${currentProblemIdFromHash}?pincode=${correctPincode}`;
                        if (currentEmbedStatus === 'true') {
                            targetHash += '&embed=true'; // Append if originally embedded
                        }
                        // --- MODIFICATION END ---

                        if (location.hash !== targetHash) { // Use the potentially modified targetHash
                            location.hash = targetHash; // Navigate
                        } else {
                             showNotification("已在解答頁面。"); // Or reload if needed, considering embed status might change this logic slightly if needed
                        }
                    } else {
                        showNotification("Pincode 錯誤！");
                    }
                } else {
                    showNotification("錯誤：找不到此題目的 Pincode 資訊。");
                    console.error(`Pincode info not found for problem ID: ${currentProblemIdFromHash} in problems.json`);
                }
            } catch (error) {
                console.error("載入或驗證 Pincode 時發生錯誤:", error);
                showNotification("驗證 Pincode 時發生錯誤，請稍後再試。");
            }
        });
    }
    // End Load Example Button Listener

    // --- Generic Info Modal Logic ---
    function openInfoModal(title, description, contentToDisplay, contentToCopy) {
        if (!infoModal || !modalTitle || !modalDescription || !modalContentDisplay) {
            console.error("Modal elements missing, cannot open modal.");
            showNotification("開啟資訊視窗時發生錯誤。");
            return;
        }
        modalTitle.textContent = title;
        modalDescription.textContent = description;
        modalContentDisplay.textContent = contentToDisplay;
        // Store the text to be copied in a data attribute for the copy button
        modalContentDisplay.dataset.copyText = contentToCopy || contentToDisplay; // Fallback to displayed text if copy text not provided

        infoModal.style.display = 'block';
        setTimeout(() => infoModal.classList.add('show'), 10); // For transition
    }

    function closeInfoModal() {
        if (!infoModal) return;
        infoModal.classList.remove('show');
        setTimeout(() => {
            if (!infoModal.classList.contains('show')) {
                infoModal.style.display = 'none';
            }
        }, 300); // Match CSS transition duration
    }

    // View Pincode Button Listener (Uses Generic Modal)
    if (viewPincodeBtn) {
        viewPincodeBtn.addEventListener('click', async () => {
            const { problemId: currentProblemIdFromHash } = parseHash();
            if (!currentProblemIdFromHash) {
                showNotification("錯誤：無法從目前網址取得題目 ID。"); return;
            }
            try {
                const resp = await fetch('data/problems.json');
                if (!resp.ok) throw new Error(`無法讀取 problems.json: ${resp.statusText}`);
                const problems = await resp.json();
                const problemInfo = problems.find(p => p.id === currentProblemIdFromHash);

                if (problemInfo && problemInfo.pincode !== undefined) {
                    openInfoModal(
                        "老師幫幫我",
                        "這一題的密碼如下，但這只是其中一種的解題方式，並不是最好的解題方式唷！",
                        problemInfo.pincode, // Display pincode
                        problemInfo.pincode  // Copy pincode
                    );
                } else {
                    showNotification("錯誤：找不到此題目的 Pincode 資訊。");
                    console.error(`Pincode info not found for problem ID: ${currentProblemIdFromHash} in problems.json`);
                }
            } catch (error) {
                console.error("讀取 Pincode 以顯示時發生錯誤:", error);
                showNotification("讀取 Pincode 時發生錯誤。");
            }
        });
    }

    // Share Problem Button Listener (Uses Generic Modal) <-- 新增
    if (shareProblemBtn) {
        shareProblemBtn.addEventListener('click', () => {
            const currentUrl = location.href;
            // Remove the query string part (?pincode=...)
            const shareUrl = currentUrl.split('?')[0];
            openInfoModal(
                "分享題目連結",
                "請手動複製此連結，並提供給需要的使用者，此網址開啟的頁面不會包含範例解答密碼。",
                shareUrl, // Display the clean URL
                shareUrl  // Copy the clean URL
            );
        });
    }

    // Modal Close Button Listener (Uses Generic Modal)
    if (closeInfoModalBtn) {
        closeInfoModalBtn.addEventListener('click', closeInfoModal);
    }

    // Modal Copy Button Listener (Uses Generic Modal)
    if (copyContentBtn && modalContentDisplay) {
        copyContentBtn.addEventListener('click', () => {
            const textToCopy = modalContentDisplay.dataset.copyText; // Get text from data attribute
            if (textToCopy && navigator.clipboard) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    showNotification("內容已複製！");
                }).catch(err => {
                    console.error('無法複製內容: ', err);
                    showNotification("複製失敗，請手動複製。");
                });
            } else {
                showNotification("複製功能無法使用或無內容可複製。");
            }
        });
    }

    // Optional: Close modal when clicking outside the modal content (Uses Generic Modal)
    if (infoModal) {
        infoModal.addEventListener('click', (event) => {
            if (event.target === infoModal) { // Check if the click is on the background overlay
                closeInfoModal(); // Use the close function
            }
        });
    }
    // --- End Generic Info Modal Logic ---


    // Help Panel Listeners
    // Removed code related to helpBtn as the button was removed from HTML.
    if (shortcutsHelp && closeHelpBtn) {
        // Keep close button functionality if needed independently, or remove this block too if not.
        // For now, let's assume close button might still be relevant if panel is shown differently.
        // If the panel is *only* shown via the removed button, this 'else' is also redundant.
        closeHelpBtn.addEventListener('click', () => { shortcutsHelp.classList.remove('show'); /* helpBtn no longer exists to focus */ });
        // The document listeners for closing might still be useful if the panel can be shown by other means.
        // If not, remove these too.
        document.addEventListener('click', (event) => { if (!shortcutsHelp.contains(event.target) /* && !helpBtn.contains(event.target) */ && shortcutsHelp.classList.contains('show')) { shortcutsHelp.classList.remove('show'); /* helpBtn no longer exists */ } });
        document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && shortcutsHelp.classList.contains('show')) { shortcutsHelp.classList.remove('show'); /* helpBtn no longer exists to focus */ } });
    } else { console.warn("Help panel elements (shortcutsHelp or closeHelpBtn) not found, help functionality disabled."); }


    // Keyboard Shortcuts Listener
    document.addEventListener('keydown', function(e) {
        const activeElement = document.activeElement;
        const isEditorFocused = activeElement === userCodeTextarea;
        const isBodyFocused = activeElement === document.body;
        const isButtonFocused = activeElement?.tagName === 'BUTTON'; // Check if activeElement exists
        const isResultFocused = !!activeElement?.closest('.test-cases-container');
        const isHelpPanelFocused = shortcutsHelp && shortcutsHelp.contains(activeElement);
        const canTriggerShortcut = !isHelpPanelFocused && (isEditorFocused || isBodyFocused || isButtonFocused || isResultFocused);

        if (canTriggerShortcut && problemConfig) { // Ensure config is loaded for shortcuts
            if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); if (runButton && !runButton.disabled) { runButton.click(); } else { showNotification("執行環境尚未就緒或目前無法執行。"); } }
            else if (e.ctrlKey && (e.key === 's' || e.key === 'S')) { e.preventDefault(); if (saveCodeBtn && !saveCodeBtn.disabled) saveCodeBtn.click(); }
            else if (e.ctrlKey && e.shiftKey && (e.key === 'R' || e.key === 'r')) { e.preventDefault(); if (resetCodeBtn && !resetCodeBtn.disabled) resetCodeBtn.click(); }
            // Optional: Ctrl+Shift+L for language switch
            // else if (e.ctrlKey && e.shiftKey && (e.key === 'L' || e.key === 'l')) { e.preventDefault(); if (switchEditorBtn && !switchEditorBtn.disabled) switchEditorBtn.click(); }
        }
    });

    // Textarea Tab/Shift+Tab Support
    if (userCodeTextarea) {
        userCodeTextarea.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.selectionStart; const end = this.selectionEnd; const text = this.value; const tab = '  ';
                const selectedText = text.substring(start, end); const includesNewline = selectedText.includes('\n');
                if (e.shiftKey) { // Unindent
                    let clStart = text.lastIndexOf('\n', start - 1) + 1; if (start === 0) clStart = 0;
                    let clEnd = text.indexOf('\n', end); if (clEnd === -1) clEnd = text.length; if (end > 0 && text[end - 1] === '\n' && start !== end) clEnd = end - 1;
                    const affected = text.substring(clStart, clEnd); const lines = affected.split('\n'); let removedTotal = 0; let firstRemoved = -1;
                    const modified = lines.map((line) => { let remove = 0; if (line.startsWith(tab)) remove = tab.length; else if (line.startsWith(' ')) remove = 1; if (remove > 0) { if (firstRemoved === -1) firstRemoved = remove; removedTotal += remove; return line.substring(remove); } else { if (firstRemoved === -1) firstRemoved = 0; return line; } });
                    if (firstRemoved === -1) firstRemoved = 0;
                    this.value = text.substring(0, clStart) + modified.join('\n') + text.substring(clEnd);
                    this.selectionStart = Math.max(clStart, start - firstRemoved); this.selectionEnd = Math.max(this.selectionStart, end - removedTotal);
                } else { // Indent
                    if (start !== end && includesNewline) { // Multi-line
                        let clStart = text.lastIndexOf('\n', start - 1) + 1; if (start === 0) clStart = 0;
                        let clEnd = text.indexOf('\n', end - (start === end ? 0 : 1)); if (clEnd === -1 || clEnd < start) clEnd = text.length; if (end > 0 && text[end - 1] === '\n' && start !== end) clEnd = end - 1;
                        const affected = text.substring(clStart, clEnd); const lines = affected.split('\n'); let addedTotal = 0; let firstAdded = 0; let appliedFirst = false;
                        const modified = lines.map((line) => { if (line.trim() === '' && lines.length > 1) { if (!appliedFirst) { firstAdded = 0; appliedFirst = true; } return line; } if (!appliedFirst) { firstAdded = tab.length; appliedFirst = true; } addedTotal += tab.length; return tab + line; });
                        if (!appliedFirst) firstAdded = 0;
                        this.value = text.substring(0, clStart) + modified.join('\n') + text.substring(clEnd);
                        this.selectionStart = start + firstAdded; this.selectionEnd = end + addedTotal;
                    } else { // Single line
                        this.value = text.substring(0, start) + tab + text.substring(end); this.selectionStart = this.selectionEnd = start + tab.length;
                    }
                }
            }
        });
    } else { console.error("Textarea element not found, tab functionality disabled."); }

    // Set flag to true after successful attachment
    eventListenersAttached = true;
    console.log("Event listeners attached successfully.");
}
// --- End Event Listeners Setup ---


// --- Main Application Initialization ---
async function initializeApp() {
    console.log("Initializing application...");
    // Initial UI update (will disable buttons until config loads)
    updateEditorUI();
    // Setup event listeners once
    setupEventListeners();

    // Handle routing on load (show list or problem detail)
    await handleRoute();

    // Initialize Pyodide (async)
    initializePyodide();

    // Final UI update
    updateEditorUI();
}

// Start the application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
window.addEventListener('hashchange', handleRoute);
