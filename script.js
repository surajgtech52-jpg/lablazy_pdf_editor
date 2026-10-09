document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const processBtn = document.getElementById('processBtn');
    const fileCountPill = document.getElementById('fileCountPill');
    
    const studentNameInput = document.getElementById('studentName');
    const moodleIdInput = document.getElementById('moodleId');
    const rollNoInput = document.getElementById('rollNo');
    
    const resultsSection = document.getElementById('resultsSection');
    const processedList = document.getElementById('processedList');

    let files = [];
    const MAX_FILES = 10;

    // --- Drag and Drop Handlers ---
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', handleDrop, false);
    dropZone.addEventListener('click', () => fileInput.click()); // Enable click to upload
    fileInput.addEventListener('change', handleFiles, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const droppedFiles = dt.files;
        handleFiles({ target: { files: droppedFiles } });
    }

    function handleFiles(e) {
        const newFiles = Array.from(e.target.files).filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
        
        if (newFiles.length === 0) {
            alert('Please select valid PDF files.');
            return;
        }

        if (files.length + newFiles.length > MAX_FILES) {
            alert(`You can only upload up to ${MAX_FILES} PDFs at a time.`);
            return;
        }

        files = [...files, ...newFiles];
        updateFileList();
        updateProcessButton();
        
        // reset file input
        fileInput.value = '';
    }

    function removeFile(index) {
        files.splice(index, 1);
        updateFileList();
        updateProcessButton();
    }

    function updateFileList() {
        if (fileCountPill) fileCountPill.textContent = `${files.length} / ${MAX_FILES} files`;
        fileList.innerHTML = '';
        files.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            
            item.innerHTML = `
                <div class="file-name">
                    <svg class="file-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <span>${file.name}</span>
                </div>
                <button class="btn-remove" title="Remove" onclick="window.removeFile(${index})">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            `;
            fileList.appendChild(item);
        });
    }

    window.removeFile = removeFile;

    // --- Validation ---
    function updateProcessButton() {
        const canProcess = files.length > 0; 
        processBtn.disabled = !canProcess;
    }

    // --- Processing ---
    processBtn.addEventListener('click', async () => {
        const name = studentNameInput.value.trim();
        const moodle = moodleIdInput.value.trim();
        const roll = rollNoInput.value.trim();

        if (!name || !moodle || !roll) {
            alert('Please fill in Student Name, Moodle ID, and Roll Number.');
            return;
        }

        processBtn.disabled = true;
        const originalText = processBtn.innerHTML;
        processBtn.innerHTML = `
            <svg class="spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
            Processing...
        `;

        try {
            const processedFiles = [];
            const { PDFDocument, rgb } = PDFLib;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const arrayBuffer = await file.arrayBuffer();
                
                // 1. Convert arrayBuffer to a format pdf.js can read without consuming the main buffer
                const pdfjsTask = window.pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
                const pdfjsDoc = await pdfjsTask.promise;
                const pdfjsPage = await pdfjsDoc.getPage(1);
                
                // Keep track of all text across all pages for experiment number detection
                let allFullTextStr = "";
                const pagesBoxes = [];
                
                for (let pageNum = 1; pageNum <= pdfjsDoc.numPages; pageNum++) {
                    const pdfjsPageVar = await pdfjsDoc.getPage(pageNum);
                    const textContent = await pdfjsPageVar.getTextContent();
                    allFullTextStr += textContent.items.map(i => i.str).join(" ") + " ";
                    
                    let nameBoxes = [];
                    let idBoxes = [];
                    let rollBoxes = [];

                    // Group text items by line (y-coordinate) to handle PDF.js text fragmentation
                    const textLines = {};
                    for (const item of textContent.items) {
                        const str = item.str;
                        if (!str.trim()) continue;
                        
                        const x = item.transform[4];
                        const y = item.transform[5];
                        const size = Math.abs(item.transform[0]) || 11.5;
                        
                        const roundedY = Math.round(y);
                        // Match within 2 pixels tolerance for baseline
                        const lineY = Object.keys(textLines).find(k => Math.abs(k - roundedY) <= 2) || roundedY;
                        
                        if (!textLines[lineY]) textLines[lineY] = [];
                        textLines[lineY].push({ str, x, y, size });
                    }

                    // Scan combined lines for labels using Regex to support various templates
                    for (const [yStr, lineItems] of Object.entries(textLines)) {
                        // Sort items horizontally
                        lineItems.sort((a, b) => a.x - b.x);
                        const fullText = lineItems.map(i => i.str).join("").toLowerCase();
                        
                        // Helper to precisely find the starting X position and Font Size of a matched phrase
                        const getMatchDetails = (regex) => {
                            const match = fullText.match(regex);
                            if (!match) return null;
                            
                            let currentLen = 0;
                            for (const i of lineItems) {
                                if (currentLen + i.str.length > match.index) {
                                    return { x: i.x, size: i.size };
                                }
                                currentLen += i.str.length;
                            }
                            return { x: lineItems[0].x, size: lineItems[0].size };
                        };
                        
                        const nData = getMatchDetails(/(name\s*of\s*student|student\'?s?\s*name|name\s*:)/);
                        if (nData) nameBoxes.push({ x: nData.x, y: lineItems[0].y, w: 230, h: nData.size || 11.5 });
                        
                        const iData = getMatchDetails(/(student\s*id|moodle\s*id|prn|id\s*no|id\s*:)/);
                        if (iData) idBoxes.push({ x: iData.x, y: lineItems[0].y, w: 230, h: iData.size || 11.5 });
                        
                        const rData = getMatchDetails(/(roll\s*no|roll\s*number|roll\s*:)/);
                        if (rData) rollBoxes.push({ x: rData.x, y: lineItems[0].y, w: 230, h: rData.size || 11.5 });
                    }
                    
                    pagesBoxes.push({ nameBoxes, idBoxes, rollBoxes });
                }
                
                // 3. Load PDF into pdf-lib for modification
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                const pages = pdfDoc.getPages();
                
                // Embed matching font
                const timesBoldFont = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanBold);

                // 4 & 5. Wipe out old lines and draw new ones across ALL pages
                for (let pIndex = 0; pIndex < pages.length; pIndex++) {
                    const currentPage = pages[pIndex];
                    const { nameBoxes, idBoxes, rollBoxes } = pagesBoxes[pIndex] || { nameBoxes:[], idBoxes:[], rollBoxes:[] };
                    
                    function drawWipe(box) {
                        currentPage.drawRectangle({
                            x: box.x - 2, 
                            y: box.y - 2, 
                            width: box.w,
                            height: box.h + 5, // Extra generous height to cover original perfectly
                            color: rgb(1, 1, 1),
                        });
                    }
                    
                    function drawLine(box, text) {
                        currentPage.drawText(text, {
                            x: box.x,
                            y: box.y - 0.5,
                            size: box.h,
                            font: timesBoldFont,
                            color: rgb(0, 0, 0),
                        });
                    }

                    nameBoxes.forEach(drawWipe);
                    idBoxes.forEach(drawWipe);
                    rollBoxes.forEach(drawWipe);
                    
                    nameBoxes.forEach(box => drawLine(box, "Name of Student: " + name));
                    idBoxes.forEach(box => drawLine(box, "Student ID: " + moodle));
                    rollBoxes.forEach(box => drawLine(box, "Roll No: " + roll));
                }

                // Serialize
                const pdfBytes = await pdfDoc.save();
                
                // Keep track for zip
                let expNo = "1";
                const expMatch = allFullTextStr.match(/Experiment\s*No\.?\s*(\d+)/i);
                if (expMatch) {
                    expNo = expMatch[1];
                }

                const safeName = name.replace(/\s+/g, '_').toLowerCase();
                const newFilename = `${safeName}_exp${expNo}.pdf`;
                
                // Create a blob & URL for individual download
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                
                processedFiles.push({ name: newFilename, url });
            }

            showResults(processedFiles);

        } catch (error) {
            console.error(error);
            alert('An error occurred while processing the PDFs.');
        } finally {
            processBtn.innerHTML = originalText;
            processBtn.disabled = false;
        }
    });

    function showResults(processedFiles) {
        resultsSection.classList.remove('hidden');
        processedList.innerHTML = '';

        processedFiles.forEach((file) => {
            const item = document.createElement('div');
            item.className = 'processed-item';
            item.innerHTML = `
                <div class="processed-name">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    <span>${file.name}</span>
                </div>
                <div class="action-buttons">
                    <button class="btn-preview" onclick="window.previewPdf('${file.url}')">Preview</button>
                    <a href="${file.url}" download="${file.name}" class="btn-download">Download</a>
                </div>
            `;
            processedList.appendChild(item);
        });

        if (processedFiles.length > 0) { // Always show download all
            const downloadAllBtn = document.createElement('a');
            downloadAllBtn.href = "#";
            downloadAllBtn.className = "btn-download-all";
            downloadAllBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Download All (${processedFiles.length} files)
            `;
            
            // Trigger sequential downloads
            downloadAllBtn.addEventListener('click', (e) => {
                e.preventDefault();
                processedFiles.forEach((file, index) => {
                    setTimeout(() => {
                        const a = document.createElement('a');
                        a.href = file.url;
                        a.download = file.name;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    }, index * 400); // 400ms delay helps browsers allow multiple downloads safely
                });
            });
            
            processedList.appendChild(downloadAllBtn);
        }

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Modal Logic
    const modal = document.getElementById('previewModal');
    const iframe = document.getElementById('previewIframe');
    const closeModalBtn = document.getElementById('closeModalBtn');

    window.previewPdf = function(url) {
        iframe.src = url;
        modal.classList.remove('hidden');
    };

    closeModalBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        iframe.src = "";
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            iframe.src = "";
        }
    });

    // Handle button disabled state initially
    updateProcessButton();
});

// Adding keyframe style for spinner inside JS to keep it self-contained
const style = document.createElement('style');
style.innerHTML = `
    @keyframes spin {
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

const bugReportBtn = document.getElementById('bugReportBtn');
const bugReportModal = document.getElementById('bugReportModal');
const closeBugReportBtn = document.getElementById('closeBugReportBtn');
const bugReportForm = document.getElementById('bugReportForm');
const bugReportStatus = document.getElementById('bugReportStatus');
const submitBugReportBtn = document.getElementById('submitBugReportBtn');

function closeBugReport() {
    bugReportModal.classList.add('hidden');
    bugReportStatus.textContent = '';
}

bugReportBtn.addEventListener('click', () => {
    bugReportModal.classList.remove('hidden');
    document.getElementById('reporterEmail').focus();
});

closeBugReportBtn.addEventListener('click', closeBugReport);

bugReportModal.addEventListener('click', (event) => {
    if (event.target === bugReportModal) closeBugReport();
});

bugReportForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    submitBugReportBtn.disabled = true;
    submitBugReportBtn.textContent = 'Sending...';
    bugReportStatus.textContent = '';

    try {
        const response = await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.fromEntries(new FormData(bugReportForm)))
        });

        const responseText = await response.text();
        let result = {};

        if (responseText.trim()) {
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Feedback endpoint returned invalid JSON:', parseError);
            }
        }

        if (!response.ok) {
            throw new Error(result.error || 'Unable to send report.');
        }

        bugReportForm.reset();
        bugReportStatus.textContent = 'Thanks. Your report was submitted.';
        bugReportStatus.style.color = '#047857';
    } catch (error) {
        bugReportStatus.textContent = error.message;
        bugReportStatus.style.color = '#b91c1c';
    } finally {
        submitBugReportBtn.disabled = false;
        submitBugReportBtn.textContent = 'Send report';
    }
});
