# Judge Beginner

## 專案描述

一個簡易的線上程式解題平台，專為初學者設計，支援在瀏覽器中直接編寫和執行 Python 與 JavaScript 程式碼來解決特定問題。

## 主要功能

*   瀏覽器內程式碼編輯 (Python/JavaScript)
*   使用 Pyodide 執行 Python 程式碼
*   使用瀏覽器引擎執行 JavaScript 程式碼
*   根據預設測試案例自動評判程式碼
*   顯示題目描述、輸入/輸出格式、範例和提示 (支援 MathJax 數學公式)
*   題目列表頁面
*   透過 Pincode 保護範例解答
*   分享特定題目連結
*   特定題目可嵌入 (`embed=true`) 模式，用於特殊場景

## 專案結構

```
.
├── README.md               # 本檔案
├── index.html              # 主要的 HTML 結構
├── script.js               # 核心 JavaScript 邏輯
├── style.css               # 主要的 CSS 樣式
├── data/                   # 存放所有題目資料
│   ├── problems.json       # 題目索引檔 (ID, title, description, pincode, order)
│   └── [題目ID].json       # 各題目的詳細設定檔 (內容, 測試案例, 程式碼等)
├── static/                 # 存放靜態資源
│   ├── icon.png
│   └── logo.png
├── 出題指南.md             # 如何新增或修改題目的詳細說明
├── editor.html             # (可能未使用或為舊版編輯器)
└── editor.js               # (可能未使用或為舊版編輯器)
```

## 如何新增/修改題目

請參考專案中的 `出題指南.md` 檔案以獲取詳細步驟。

主要步驟概述：

1.  在 `data/` 資料夾中建立一個新的 `[UUID].json` 檔案，遵循現有題目的格式。UUID 可以使用線上工具生成。
2.  更新 `data/problems.json`，在陣列中加入新題目的基本資訊，包含 `"id"`, `"title"`, `"description"`, `"pincode"` (若需密碼保護範例解答), 和 `"order"` (用於排序)。

## URL 參數說明

本專案支援透過 URL Hash 和查詢參數來控制顯示內容：

*   **路徑:**
    *   `#/problems`: 顯示題目列表頁面。
    *   `#/problem/[題目ID]`: 顯示指定 `[題目ID]` 的題目詳細頁面。

*   **查詢參數 (Query Parameters):** (需與 `#/problem/[題目ID]` 路徑搭配使用)
    *   `?pincode=[密碼]`
        *   **用途：** 驗證並載入範例解答。
        *   **說明：** 如果提供的 `[密碼]` 與該題目在 `data/problems.json` 中設定的 `pincode` 相符，頁面會自動載入範例程式碼，並顯示「查看解答密碼」按鈕、隱藏「載入範例解答」按鈕。若密碼不符或未提供，則載入預設程式碼或使用者上次儲存的程式碼。
    *   `?embed=true`
        *   **用途：** 啟用嵌入模式，可能改變頁面部分元素的顯示。
        *   **目前效果：**
            *   當 `題目ID` 為 `3A5FA4C1-B28E-469C-BB88-F238F5713CF3` **且** 網址包含 `embed=true` 時，頁面頂部的「分享此題」按鈕會顯示。
            *   在所有其他情況下（不同題目 ID、缺少 `embed=true`、或 `embed` 值不是 `true`），「分享此題」按鈕會隱藏。

## 如何執行

*   **本地執行:** 這是一個純前端專案，可以直接在支援 JavaScript 的現代瀏覽器中開啟 `index.html` 檔案進行瀏覽和測試。
*   **部署:** 將專案的所有檔案（HTML, CSS, JS, data/, static/）上傳到任何支援靜態檔案託管的伺服器即可，例如：
    *   GitHub Pages
    *   Netlify
    *   Vercel
    *   或其他傳統的網頁伺服器 (Nginx, Apache 等)

## 外部依賴

本專案透過 CDN 載入以下外部函式庫：

*   **Pyodide:** 用於在瀏覽器執行 Python 程式碼。
*   **MathJax:** 用於渲染 LaTeX 數學公式。
*   **Font Awesome:** 提供圖示。

確保使用者在瀏覽時有網路連線，以便載入這些依賴項。
