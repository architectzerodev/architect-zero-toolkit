'use strict';

// ==========================================
// VENDORIZED MICRO-ZIP ENGINE
// ==========================================
class JSZip {
    constructor() { this.files = []; this.encoder = new TextEncoder(); }
    file(name, blob) { this.files.push({ name, blob, date: new Date() }); return this; }
    async generateAsync(options) {
        const PK_LOCAL_HEADER = 0x04034b50, PK_CENTRAL_HEADER = 0x02014b50, PK_END_HEADER = 0x06054b50;
        const parts = [], centralDir = [];
        let offset = 0;
        const crcTable = new Int32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            crcTable[i] = c;
        }
        const crc32 = (arr) => {
            let crc = -1;
            for (let i = 0; i < arr.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ arr[i]) & 0xFF];
            return (crc ^ -1) >>> 0;
        };
        for (const file of this.files) {
            const nameBytes = this.encoder.encode(file.name);
            const buffer = await file.blob.arrayBuffer();
            const data = new Uint8Array(buffer);
            const crc = crc32(data), size = data.length;
            const d = file.date;
            const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
            const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
            const header = new Uint8Array(30 + nameBytes.length);
            const view = new DataView(header.buffer);
            view.setUint32(0, PK_LOCAL_HEADER, true); view.setUint16(4, 10, true); view.setUint16(6, 0, true);
            view.setUint16(8, 0, true); view.setUint16(10, time, true); view.setUint16(12, date, true);
            view.setUint32(14, crc, true); view.setUint32(18, size, true); view.setUint32(22, size, true);
            view.setUint16(26, nameBytes.length, true); view.setUint16(28, 0, true); header.set(nameBytes, 30);
            parts.push(header); parts.push(data);
            const cdr = new Uint8Array(46 + nameBytes.length);
            const cdrView = new DataView(cdr.buffer);
            cdrView.setUint32(0, PK_CENTRAL_HEADER, true); cdrView.setUint16(4, 10, true); cdrView.setUint16(6, 10, true);
            cdrView.setUint16(8, 0, true); cdrView.setUint16(10, 0, true); cdrView.setUint16(12, time, true);
            cdrView.setUint16(14, date, true); cdrView.setUint32(16, crc, true); cdrView.setUint32(20, size, true);
            cdrView.setUint32(24, size, true); cdrView.setUint16(28, nameBytes.length, true); cdrView.setUint16(30, 0, true);
            cdrView.setUint16(32, 0, true); cdrView.setUint16(34, 0, true); cdrView.setUint16(36, 0, true);
            cdrView.setUint32(38, 0, true); cdrView.setUint32(42, offset, true); cdr.set(nameBytes, 46);
            centralDir.push(cdr); offset += header.length + size;
        }
        const cdrTotalSize = centralDir.reduce((acc, val) => acc + val.length, 0);
        const endHeader = new Uint8Array(22);
        const endView = new DataView(endHeader.buffer);
        endView.setUint32(0, PK_END_HEADER, true); endView.setUint16(4, 0, true); endView.setUint16(6, 0, true);
        endView.setUint16(8, this.files.length, true); endView.setUint16(10, this.files.length, true);
        endView.setUint32(12, cdrTotalSize, true); endView.setUint32(16, offset, true); endView.setUint16(20, 0, true);
        return new Blob([...parts, ...centralDir, endHeader], { type: options.type || 'application/zip' });
    }
}

// ==========================================
// APPLICATION LOGIC (CORE)
// ==========================================

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');
const btnDownloadAll = document.getElementById('btnDownloadAll');
const btnReset = document.getElementById('btnReset');
const actionArea = document.getElementById('actionArea');
const mobileWarning = document.getElementById('mobileWarning');

// State
let convertedFiles = [];
let isProcessing = false;

// Utility: Check if device is likely mobile/tablet
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth < 800);
};

// Event Listeners
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault(); e.stopPropagation();
        dropZone.classList.add('drag-over');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault(); e.stopPropagation();
        dropZone.classList.remove('drag-over');
    }, false);
});

dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    handleFiles(dt.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
});

btnReset.addEventListener('click', resetInterface);

btnDownloadAll.addEventListener('click', async () => {
    if (convertedFiles.length === 0) return;
    const btnOriginalText = btnDownloadAll.innerHTML;
    btnDownloadAll.disabled = true;
    btnDownloadAll.textContent = "Compressing...";

    try {
        const zip = new JSZip();
        convertedFiles.forEach(file => zip.file(file.name, file.blob));
        const content = await zip.generateAsync({ type: "application/zip" });
        const url = URL.createObjectURL(content);
        triggerDownload(url, `architect-zero-converted-${Date.now()}.zip`);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (error) {
        alert("Error generating ZIP. Insufficient memory.");
        console.error(error);
    } finally {
        btnDownloadAll.disabled = false;
        btnDownloadAll.innerHTML = btnOriginalText;
    }
});

function resetInterface() {
    if (isProcessing) return;
    convertedFiles.forEach(f => { if (f.blob) URL.revokeObjectURL(f.blob); });
    convertedFiles = [];
    fileList.innerHTML = '';
    actionArea.style.display = 'none';
    progressContainer.style.display = 'none';
    mobileWarning.style.display = 'none';
    dropZone.style.display = 'block';
}

async function handleFiles(files) {
    if (isProcessing || files.length === 0) return;
    isProcessing = true;
    dropZone.style.display = 'none';
    fileList.innerHTML = '';
    convertedFiles = [];
    actionArea.style.display = 'none';
    mobileWarning.style.display = 'none';
    progressContainer.style.display = 'block';
    updateProgress(0, files.length);

    const fileArray = Array.from(files);
    let processedCount = 0;
    let currentTotalSize = 0; // Acumulador de segurança

    for (const file of fileArray) {
        if (!file.type.startsWith('image/')) {
            addToList(file.name, null, 'Ignored');
            processedCount++;
            updateProgress(processedCount, fileArray.length);
            continue;
        }

        try {
            const pngBlob = await convertWebPToPNG(file);
            const safeName = file.name.replace(/\.[^/.]+$/, "") + ".png";

            // Lógica de Acumulação e Disjuntor Mobile
            currentTotalSize += pngBlob.size;

            if (isMobileDevice() && currentTotalSize > 50 * 1024 * 1024) { // 50MB Limit
                convertedFiles.push({ name: safeName, blob: pngBlob });
                addToList(safeName, pngBlob, 'Success');
                processedCount++;
                updateProgress(processedCount, fileArray.length);

                // Break circuit
                alert('Memory Protection Active: Total size exceeds 50MB. ZIP download disabled to prevent browser crash. Please download files individually.');
                break;
            }

            convertedFiles.push({ name: safeName, blob: pngBlob });
            addToList(safeName, pngBlob, 'Success');

        } catch (error) {
            console.error(error);
            addToList(file.name, null, 'Error');
        }
        processedCount++;
        updateProgress(processedCount, fileArray.length);
        await new Promise(r => setTimeout(r, 20)); // Yield UI
    }

    finishProcessing();
}

function convertWebPToPNG(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            // Safe Limit for Mobile Canvas
            const MAX_PIXELS = 16 * 1024 * 1024; // 16MP
            if (img.width * img.height > MAX_PIXELS && isMobileDevice()) {
                reject(new Error("Image dimensions too large for mobile memory"));
                return;
            }
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Conversion failed"));
            }, 'image/png');
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Image load error"));
        };
        img.src = objectUrl;
    });
}

function updateProgress(current, total) {
    const percent = total === 0 ? 0 : Math.round((current / total) * 100);
    progressFill.style.width = `${percent}%`;
    progressPercent.textContent = `${percent}%`;
    progressText.textContent = `Processing ${current} of ${total}...`;
}

function finishProcessing() {
    isProcessing = false;
    progressText.textContent = "Done";
    actionArea.style.display = 'flex';

    if (convertedFiles.length > 0) {
        // Cálculo total para exibição
        const totalBytes = convertedFiles.reduce((acc, f) => acc + f.blob.size, 0);
        const LIMIT_MB = 50 * 1024 * 1024; // 50MB

        if (isMobileDevice() && totalBytes > LIMIT_MB) {
            // Disable ZIP, show Warning
            btnDownloadAll.style.display = 'none';
            mobileWarning.style.display = 'block';
        } else {
            // Allow ZIP
            btnDownloadAll.style.display = 'inline-flex';
            btnDownloadAll.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download ZIP (${formatBytes(totalBytes)})`;
            mobileWarning.style.display = 'none';
        }
    } else {
        btnDownloadAll.style.display = 'none';
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function addToList(fileName, blob, status) {
    const div = document.createElement('div');
    div.className = 'file-item';

    // Logic string comparison updated to English
    let statusClass = status === 'Success' ? 'status-done' : (status === 'Error' ? 'status-error' : 'status-pending');

    div.innerHTML = `
        <div class="file-info">
            <span class="file-name" title="${fileName}">${fileName}</span>
            <span class="status-badge ${statusClass}">${status}</span>
        </div>
    `;

    if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.className = 'single-dl-link';
        a.textContent = 'Download';
        div.appendChild(a);
    }
    fileList.appendChild(div);
}

function triggerDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
