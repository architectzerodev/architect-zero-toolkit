'use strict';

// ==========================================
// SYSTEM CONFIGURATION
// ==========================================
const SYS_CONFIG = {
    MAX_MOBILE_MEMORY: 50 * 1024 * 1024, // 50MB
    MOBILE_PIXEL_LIMIT: 16 * 1024 * 1024 // 16MP
};

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
// TOOL REGISTRY & ROUTING CONFIG
// ==========================================
const TOOLS = {
    'webp-png': {
        id: 'webp-png',
        slug: 'webp-to-png',
        pageTitle: 'WebP to PNG Converter',
        pageDesc: 'Convert WebP to PNG instantly. Lossless quality preservation.',
        label: 'WebP to PNG',
        mimeInput: ['image/webp'],
        acceptAttr: 'image/webp',
        extOutput: '.png',
        uiText: 'Drag & Drop WebP files',
        panelId: null, 
        processor: convertToPNG
    },
    'png-jpg': {
        id: 'png-jpg',
        slug: 'png-to-jpg',
        pageTitle: 'PNG to JPG Converter',
        pageDesc: 'Convert PNG to JPG for smaller file sizes.',
        label: 'PNG to JPG',
        mimeInput: ['image/png'],
        acceptAttr: 'image/png',
        extOutput: '.jpg',
        uiText: 'Drag & Drop PNG files',
        panelId: null, 
        processor: convertPNGToJPG
    },
    'jpg-png': {
        id: 'jpg-png',
        slug: 'jpg-to-png',
        pageTitle: 'JPG to PNG Converter',
        pageDesc: 'Convert JPG to PNG format.',
        label: 'JPG to PNG',
        mimeInput: ['image/jpeg'],
        acceptAttr: 'image/jpeg',
        extOutput: '.png',
        uiText: 'Drag & Drop JPG files',
        panelId: null,
        processor: convertToPNG
    },
    'to-webp': {
        id: 'to-webp',
        slug: 'to-webp',
        pageTitle: 'Convert to WebP',
        pageDesc: 'Convert images to WebP for modern web performance.',
        label: 'To WebP',
        mimeInput: ['image/jpeg', 'image/png'],
        acceptAttr: 'image/jpeg, image/png',
        extOutput: '.webp',
        uiText: 'Drag & Drop JPG/PNG',
        panelId: null,
        processor: convertToWebP
    },
    'jpg-compressor': {
        id: 'jpg-compressor',
        slug: 'compressor',
        pageTitle: 'Image Compressor',
        pageDesc: 'Compress JPG and PNG images efficiently.',
        label: 'Compressor',
        mimeInput: ['image/jpeg', 'image/png'],
        acceptAttr: 'image/jpeg, image/png',
        extOutput: '.jpg',
        uiText: 'Drag & Drop JPG/PNG',
        panelId: 'panelQuality', 
        processor: compressJPG
    },
    'image-resizer': {
        id: 'image-resizer',
        slug: 'resizer',
        pageTitle: 'Free Image Resizer',
        pageDesc: 'Resize images with preserved aspect ratio.',
        label: 'Resizer',
        mimeInput: ['image/jpeg', 'image/png', 'image/webp'],
        acceptAttr: 'image/*',
        extOutput: null, 
        uiText: 'Drag & Drop Images',
        panelId: 'panelResize', 
        processor: resizeImage
    }
};

let currentToolId = 'webp-png';

// ==========================================
// DOM ELEMENTS
// ==========================================
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
const dropZoneTitle = document.getElementById('dropZoneTitle');
const toolSelector = document.getElementById('toolSelector'); 
const footerNav = document.querySelector('.footer-nav');

// Dynamic Meta Elements
const appTitle = document.getElementById('appTitle');
const metaDesc = document.getElementById('metaDesc');

// Panels & Inputs
const allPanels = document.querySelectorAll('.panel-config');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const maintainRatio = document.getElementById('maintainRatio');

// State
let convertedFiles = [];
let isProcessing = false;

// Utility: Check if device is likely mobile/tablet
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth < 800);
};

// ==========================================
// ROUTER & INITIALIZATION
// ==========================================

const Router = {
    init: () => {
        const path = window.location.pathname.replace('/', '');
        let foundToolId = 'webp-png'; // Default

        for (const key in TOOLS) {
            if (TOOLS[key].slug === path) {
                foundToolId = key;
                break;
            }
        }
        
        Router.activate(foundToolId, false);

        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.toolId) {
                Router.activate(e.state.toolId, false);
            }
        });
    },

    navigate: (toolId) => {
        Router.activate(toolId, true);
    },

    activate: (toolId, pushHistory) => {
        if (isProcessing) return;

        const tool = TOOLS[toolId];
        if (!tool) return;

        currentToolId = toolId;

        // 0. Update Selector Value (Critical for Back Button)
        if (toolSelector) toolSelector.value = toolId;

        // 1. Update DOM Visuals
        if (appTitle) appTitle.textContent = tool.pageTitle;
        if (dropZoneTitle) dropZoneTitle.textContent = tool.uiText;
        
        // 2. Update Metadata
        document.title = `${tool.pageTitle} | Architect Zero`;
        if (metaDesc) metaDesc.content = tool.pageDesc;

        // 3. Update Panels
        allPanels.forEach(p => p.style.display = 'none');
        if (tool.panelId) {
            const activePanel = document.getElementById(tool.panelId);
            if (activePanel) activePanel.style.display = 'block';
        }

        // 4. Update Inputs
        fileInput.accept = tool.acceptAttr;

        // 5. History Management
        if (pushHistory) {
            const newPath = tool.slug === 'webp-to-png' ? '/' : `/${tool.slug}`;
            try {
                 window.history.pushState({ toolId: toolId }, tool.pageTitle, newPath);
            } catch (e) {
                console.warn('History API not supported in this environment');
            }
        }

        resetInterface();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Router.init();
});

if (qualitySlider) {
    qualitySlider.addEventListener('input', (e) => {
        const val = Math.round(e.target.value * 100);
        if (qualityValue) qualityValue.textContent = `${val}%`;
    });
}

// Tool Switching Logic (Selector)
if (toolSelector) {
    toolSelector.addEventListener('change', (e) => {
        Router.navigate(e.target.value);
    });
}

// Footer Link Delegation
if (footerNav) {
    footerNav.addEventListener('click', (e) => {
        if (e.target.classList.contains('js-route-link')) {
            e.preventDefault();
            const targetTool = e.target.getAttribute('data-tool');
            if (targetTool !== currentToolId) {
                Router.navigate(targetTool);
            }
        }
    });
}

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
        triggerDownload(url, `architect-zero-${currentToolId}-${Date.now()}.zip`);
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
    if(widthInput) widthInput.value = '';
    if(heightInput) heightInput.value = '';
}

async function handleFiles(files) {
    if (isProcessing || files.length === 0) return;
    
    const activeTool = TOOLS[currentToolId];
    isProcessing = true;
    
    // UI Prep
    dropZone.style.display = 'none';
    fileList.innerHTML = '';
    convertedFiles = [];
    actionArea.style.display = 'none';
    mobileWarning.style.display = 'none';
    progressContainer.style.display = 'block';
    updateProgress(0, files.length);

    const fileArray = Array.from(files);
    let processedCount = 0;
    let currentTotalSize = 0;

    for (const file of fileArray) {
        // Dynamic MIME check
        const isMimeValid = activeTool.id === 'image-resizer' 
            ? file.type.startsWith('image/') 
            : activeTool.mimeInput.includes(file.type);

        if (!isMimeValid) {
            addToList(file.name, null, 'Ignored (Type)');
            processedCount++;
            updateProgress(processedCount, fileArray.length);
            continue;
        }

        try {
            const outputBlob = await activeTool.processor(file);
            
            // Name Generation
            let safeName;
            if (activeTool.extOutput) {
                safeName = file.name.replace(/\.[^/.]+$/, "") + activeTool.extOutput;
            } else {
                safeName = file.name; 
            }

            // Memory Safety Check
            currentTotalSize += outputBlob.size;
            if (isMobileDevice() && currentTotalSize > SYS_CONFIG.MAX_MOBILE_MEMORY) {
                convertedFiles.push({ name: safeName, blob: outputBlob });
                addToList(safeName, outputBlob, 'Success');
                processedCount++;
                updateProgress(processedCount, fileArray.length);

                alert('Memory Protection Active: Total size exceeds Limit. ZIP download disabled.');
                break;
            }

            // Calculation of Savings / Stats
            let metaInfo = null;
            if (['jpg-compressor', 'image-resizer', 'to-webp'].includes(activeTool.id)) {
                const diff = file.size - outputBlob.size;
                const ratio = Math.round((diff / file.size) * 100);
                
                if (diff > 0) {
                    metaInfo = `saved ${ratio}% (${formatBytes(diff)})`;
                } else if (diff < 0) {
                    metaInfo = `+${formatBytes(Math.abs(diff))}`;
                } else {
                    metaInfo = `No Change`;
                }
            }

            convertedFiles.push({ name: safeName, blob: outputBlob });
            addToList(safeName, outputBlob, 'Success', metaInfo);

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

// ==========================================
// PROCESSORS
// ==========================================

// REFACTOR: Generic PNG Converter (Handles WebP and JPG input)
function convertToPNG(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            if (img.width * img.height > SYS_CONFIG.MOBILE_PIXEL_LIMIT && isMobileDevice()) {
                reject(new Error("Image dimensions too large for mobile"));
                return;
            }
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(b => b ? resolve(b) : reject(new Error("Fail")), 'image/png');
        };
        img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Load error")); };
        img.src = objectUrl;
    });
}

function convertPNGToJPG(file) {
    return processCanvasToJPG(file, 0.9);
}

// NEW: Generic WebP Converter
function convertToWebP(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            if (img.width * img.height > SYS_CONFIG.MOBILE_PIXEL_LIMIT && isMobileDevice()) {
                reject(new Error("Too large"));
                return;
            }
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            // Default quality 0.8 as requested
            canvas.toBlob(b => b ? resolve(b) : reject(new Error("Fail")), 'image/webp', 0.8);
        };
        img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Load error")); };
        img.src = objectUrl;
    });
}

function compressJPG(file) {
    const q = qualitySlider ? parseFloat(qualitySlider.value) : 0.8;
    return processCanvasToJPG(file, q);
}

function resizeImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            let targetW = widthInput && widthInput.value ? parseInt(widthInput.value) : 0;
            let targetH = heightInput && heightInput.value ? parseInt(heightInput.value) : 0;
            const keepRatio = maintainRatio ? maintainRatio.checked : true;

            let finalW = img.width;
            let finalH = img.height;

            if (targetW > 0 || targetH > 0) {
                if (keepRatio) {
                    if (targetW === 0) targetW = 99999;
                    if (targetH === 0) targetH = 99999;
                    const ratio = Math.min(targetW / img.width, targetH / img.height);
                    finalW = Math.round(img.width * ratio);
                    finalH = Math.round(img.height * ratio);
                } else {
                    finalW = targetW > 0 ? targetW : img.width;
                    finalH = targetH > 0 ? targetH : img.height;
                }
            }

            if (finalW * finalH > SYS_CONFIG.MOBILE_PIXEL_LIMIT && isMobileDevice()) {
                reject(new Error("Output too large for mobile memory"));
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = finalW;
            canvas.height = finalH;
            const ctx = canvas.getContext('2d');

            if (file.type === 'image/jpeg') {
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, finalW, finalH);
            }
            
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, finalW, finalH);

            const outType = file.type; 
            const quality = 0.92;

            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Resize failed"));
            }, outType, quality);
        };

        img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Image load error")); };
        img.src = objectUrl;
    });
}

function processCanvasToJPG(file, quality) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            if (img.width * img.height > SYS_CONFIG.MOBILE_PIXEL_LIMIT && isMobileDevice()) {
                reject(new Error("Too large"));
                return;
            }
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(b => b ? resolve(b) : reject(new Error("Fail")), 'image/jpeg', quality);
        };
        img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Load error")); };
        img.src = objectUrl;
    });
}

// ==========================================
// UI HELPERS
// ==========================================

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
        const totalBytes = convertedFiles.reduce((acc, f) => acc + f.blob.size, 0);

        if (isMobileDevice() && totalBytes > SYS_CONFIG.MAX_MOBILE_MEMORY) {
            btnDownloadAll.style.display = 'none';
            mobileWarning.style.display = 'block';
        } else {
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

function addToList(fileName, blob, status, meta = null) {
    const div = document.createElement('div');
    div.className = 'file-item';

    let statusClass = 'status-pending';
    if (status === 'Success') statusClass = 'status-done';
    else if (status.includes('Ignored') || status === 'Error') statusClass = 'status-error';

    let metaHtml = '';
    if (meta) {
        const isSaving = meta.includes('saved') || meta.includes('-');
        const color = isSaving ? '#0070f3' : '#666'; 
        metaHtml = `<span style="font-size: 0.75rem; color: ${color}; margin-left: 8px; font-weight: 500;">${meta}</span>`;
    }

    div.innerHTML = `
        <div class="file-info">
            <span class="file-name" title="${fileName}">${fileName}</span>
            <span class="status-badge ${statusClass}">${status}</span>
            ${metaHtml}
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