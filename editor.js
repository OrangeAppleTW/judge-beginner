document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('problem-editor-form');
    const examplesList = document.getElementById('examples-list');
    const testcasesList = document.getElementById('testcases-list');
    const addExampleBtn = document.getElementById('add-example-btn');
    const addTestcaseBtn = document.getElementById('add-testcase-btn');
    const downloadLinksContainer = document.getElementById('download-links');
    const existingProblemsJsonTextarea = document.getElementById('existing-problems-json');

    // --- Helper Functions ---

    // Generates a UUID (simple version for browsers supporting crypto.randomUUID)
    function generateUUID() {
        if (crypto.randomUUID) {
            return crypto.randomUUID();
        } else {
            // Fallback for older browsers (less robust)
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    }

    // Splits textarea content by lines, trimming whitespace and removing empty lines
    function getTextareaLines(textareaId) {
        const textarea = document.getElementById(textareaId);
        return textarea.value.split('\n')
               .map(line => line.trim())
               .filter(line => line.length > 0);
    }

    // Creates a remove button
    function createRemoveButton() {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = '×';
        removeBtn.className = 'remove-btn';
        removeBtn.onclick = (event) => {
            event.target.closest('.dynamic-list-item').remove();
        };
        return removeBtn;
    }

    // --- Dynamic List Handling ---

    function addExample() {
        const item = document.createElement('div');
        item.className = 'dynamic-list-item example-item';
        item.innerHTML = `
            <label>輸入 (input - 每行一個值):</label>
            <textarea class="example-input" rows="3"></textarea>
            <label>輸出 (output - 每行一個值):</label>
            <textarea class="example-output" rows="3"></textarea>
            <label>說明 (explanation - 可選):</label>
            <input type="text" class="example-explanation">
        `;
        item.appendChild(createRemoveButton());
        examplesList.appendChild(item);
    }

    function addTestCase() {
        const item = document.createElement('div');
        item.className = 'dynamic-list-item testcase-item';
        item.innerHTML = `
            <label>輸入 (input - 每行一個值):</label>
            <textarea class="testcase-input" rows="3"></textarea>
            <label>預期輸出 (expectedOutput):</label>
            <input type="text" class="testcase-expected-output" required>
        `;
        item.appendChild(createRemoveButton());
        testcasesList.appendChild(item);
    }

    addExampleBtn.addEventListener('click', addExample);
    addTestcaseBtn.addEventListener('click', addTestCase);

    // Add initial example and test case
    addExample();
    addTestCase();

    // --- Form Submission ---

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        downloadLinksContainer.innerHTML = ''; // Clear previous links

        try {
            const newProblemId = generateUUID();

            // --- Collect Data ---
            const problemData = {
                title: document.getElementById('title').value,
                functionName: document.getElementById('functionName').value,
                pythonFunctionName: document.getElementById('pythonFunctionName').value,
                descriptionContentHTML: document.getElementById('descriptionContentHTML').value,
                inputFormat: getTextareaLines('inputFormat'),
                outputFormat: getTextareaLines('outputFormat'),
                examples: [],
                hints: getTextareaLines('hints'),
                defaultCode: document.getElementById('defaultCode').value,
                defaultPythonCode: document.getElementById('defaultPythonCode').value,
                exampleCode: document.getElementById('exampleCode').value,
                examplePythonCode: document.getElementById('examplePythonCode').value,
                testCases: []
            };

            // Collect examples
            document.querySelectorAll('.example-item').forEach(item => {
                problemData.examples.push({
                    input: item.querySelector('.example-input').value.split('\n').map(l => l.trim()), // Keep empty lines if intended
                    output: item.querySelector('.example-output').value.split('\n').map(l => l.trim()), // Keep empty lines if intended
                    explanation: item.querySelector('.example-explanation').value
                });
            });

            // Collect test cases
            document.querySelectorAll('.testcase-item').forEach(item => {
                problemData.testCases.push({
                    input: item.querySelector('.testcase-input').value.split('\n').map(l => l.trim()), // Keep empty lines if intended
                    expectedOutput: item.querySelector('.testcase-expected-output').value
                });
            });

            // --- Prepare problems.json ---
            let problemsList = [];
            const existingJson = existingProblemsJsonTextarea.value.trim();
            if (existingJson) {
                try {
                    problemsList = JSON.parse(existingJson);
                    if (!Array.isArray(problemsList)) {
                        throw new Error("Existing problems.json is not an array.");
                    }
                } catch (e) {
                    alert(`無法解析現有的 problems.json 內容，將從空列表開始。\n錯誤: ${e.message}`);
                    problemsList = [];
                }
            }

            const newProblemEntry = {
                id: newProblemId,
                title: problemData.title,
                order: parseInt(document.getElementById('order').value, 10),
                pincode: parseInt(document.getElementById('pincode').value, 10)
            };
            problemsList.push(newProblemEntry);

            // --- Generate Files ---
            const newProblemJsonString = JSON.stringify(problemData, null, 4); // Pretty print
            const updatedProblemsJsonString = JSON.stringify(problemsList, null, 4); // Pretty print

            // --- Create Download Links ---
            function createDownloadLink(filename, content) {
                const blob = new Blob([content], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.textContent = `下載 ${filename}`;
                downloadLinksContainer.appendChild(a);
                // Clean up the object URL after a short delay
                setTimeout(() => URL.revokeObjectURL(url), 10000);
            }

            createDownloadLink(`${newProblemId}.json`, newProblemJsonString);
            createDownloadLink('problems.json', updatedProblemsJsonString);

        } catch (error) {
            console.error("產生檔案時發生錯誤:", error);
            alert(`產生檔案時發生錯誤: ${error.message}`);
        }
    });
});
