/* =========================================
   RemoveMarca – Main Application JS
   ========================================= */

'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
let originalFile     = null;   // File object
let originalDataUrl  = null;   // base64 data URL (preview)
let resultUrl        = null;   // URL of the processed image
let progressInterval = null;   // fake progress animation

// ─── DOM References ───────────────────────────────────────────────────────────
const uploadArea      = document.getElementById('upload-area');
const fileInput       = document.getElementById('file-input');
const btnSelectFile   = document.getElementById('btn-select-file');
const processingPanel = document.getElementById('processing-panel');
const originalImg     = document.getElementById('original-img');
const resultImg       = document.getElementById('result-img');
const resultPlaceholder = document.getElementById('result-placeholder');
const resultLoading   = document.getElementById('result-loading');
const progressBar     = document.getElementById('progress-bar');
const btnProcess      = document.getElementById('btn-process');
const btnDownload     = document.getElementById('btn-download');
const btnNewImage     = document.getElementById('btn-new-image');
const errorToast      = document.getElementById('error-toast');
const errorMsg        = document.getElementById('error-msg');
const compareContainer = document.getElementById('compare-container');
const compareWrapper   = document.getElementById('compare-wrapper');
const compareBeforeWrap = document.getElementById('compare-before-wrap');
const compareHandle    = document.getElementById('compare-handle');
const compareBefore    = document.getElementById('compare-before');
const compareAfter     = document.getElementById('compare-after');

// ─── Upload Area Events ───────────────────────────────────────────────────────

// Click anywhere in upload area
uploadArea.addEventListener('click', () => fileInput.click());
btnSelectFile.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });

// File selected via dialog
fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    handleFile(e.target.files[0]);
  }
});

// Drag & Drop
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    handleFile(file);
  } else {
    showError('Por favor, envie um arquivo de imagem válido (PNG, JPG, WEBP).');
  }
});

// ─── Handle File ──────────────────────────────────────────────────────────────

function handleFile(file) {
  // Validate type
  if (!file.type.startsWith('image/')) {
    showError('Formato inválido. Por favor, envie PNG, JPG ou WEBP.');
    return;
  }

  // Validate size (10 MB)
  if (file.size > 10 * 1024 * 1024) {
    showError('Arquivo muito grande. O limite é 10 MB.');
    return;
  }

  originalFile = file;
  hideError();

  const reader = new FileReader();
  reader.onload = (e) => {
    originalDataUrl = e.target.result;
    originalImg.src = originalDataUrl;

    // Show processing panel, hide upload area
    uploadArea.classList.add('hidden');
    processingPanel.classList.remove('hidden');

    // Reset result state
    resetResultState();
  };
  reader.readAsDataURL(file);
}

// ─── Reset Result State ───────────────────────────────────────────────────────

function resetResultState() {
  resultPlaceholder.classList.remove('hidden');
  resultLoading.classList.add('hidden');
  resultImg.classList.add('hidden');
  resultImg.src = '';
  compareContainer.classList.add('hidden');
  btnDownload.classList.add('hidden');
  btnProcess.disabled = false;
  btnProcess.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Remover marca d\'água';
  resultUrl = null;
  stopProgress();
}

// ─── Process Image ────────────────────────────────────────────────────────────

async function processImage() {
  if (!originalFile) return;

  hideError();
  setProcessingState(true);
  startProgress();

  try {
    // Convert file to base64 for the fal.ai API
    const base64Data = originalDataUrl.split(',')[1];
    const mimeType   = originalFile.type || 'image/png';

    // ── Call fal.ai watermark removal endpoint ──────────────────────────────
    // We use the image-editing/text-removal model which detects and removes
    // text/watermarks while preserving the background.
    const response = await callWatermarkAPI(base64Data, mimeType);

    if (!response || !response.url) {
      throw new Error('Resposta inválida da API.');
    }

    resultUrl = response.url;
    showResult(resultUrl);

  } catch (err) {
    console.error('Erro ao processar imagem:', err);

    let message = 'Ocorreu um erro ao processar a imagem. Tente novamente.';
    if (err.message) message = err.message;

    showError(message);
    setProcessingState(false);
    stopProgress();
  }
}

// ─── Watermark Removal API ────────────────────────────────────────────────────
// Uses the fal.ai image-editing/text-removal endpoint (no API key needed in this context)

async function callWatermarkAPI(base64Data, mimeType) {
  // Build the data URL that fal expects
  const imageDataUrl = `data:${mimeType};base64,${base64Data}`;

  // fal.ai REST endpoint – text/watermark removal
  const FAL_ENDPOINT = 'https://fal.run/fal-ai/image-editing/text-removal';

  const body = {
    image_url: imageDataUrl,
  };

  const res = await fetch(FAL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errText = '';
    try { errText = await res.text(); } catch (_) {}

    // Fallback: try alternative approach
    if (res.status === 401 || res.status === 403) {
      throw new Error('API não autorizada. Verifique se a chave está configurada.');
    }
    if (res.status === 429) {
      throw new Error('Muitas requisições. Aguarde um momento e tente novamente.');
    }
    throw new Error(`Erro na API (${res.status}). ${errText.slice(0, 120)}`);
  }

  const data = await res.json();

  // Normalise response formats
  if (data.image && data.image.url) return { url: data.image.url };
  if (data.images && data.images[0] && data.images[0].url) return { url: data.images[0].url };
  if (data.output && data.output.image) return { url: data.output.image };
  if (data.url) return { url: data.url };
  if (data.image_url) return { url: data.image_url };

  throw new Error('Formato de resposta inesperado da API.');
}

// ─── Show Result ──────────────────────────────────────────────────────────────

function showResult(url) {
  stopProgress();
  setProcessingState(false);

  // Update result image
  resultLoading.classList.add('hidden');
  resultPlaceholder.classList.add('hidden');
  resultImg.src = url;
  resultImg.classList.remove('hidden');

  // Update download button
  btnDownload.href = url;
  btnDownload.classList.remove('hidden');

  // Set up compare slider
  compareBefore.src = originalDataUrl;
  compareAfter.src  = url;

  // Wait for images to load then show compare slider
  compareAfter.onload = () => {
    compareContainer.classList.remove('hidden');
    initCompareSlider();
  };
}

// ─── Processing State ─────────────────────────────────────────────────────────

function setProcessingState(isProcessing) {
  if (isProcessing) {
    resultPlaceholder.classList.add('hidden');
    resultLoading.classList.remove('hidden');
    resultImg.classList.add('hidden');
    btnProcess.disabled = true;
    btnProcess.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando…';
  } else {
    resultLoading.classList.add('hidden');
    btnProcess.disabled = false;
    btnProcess.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Remover marca d\'água';
  }
}

// ─── Fake Progress Bar ────────────────────────────────────────────────────────

function startProgress() {
  let value = 0;
  progressBar.style.width = '0%';

  progressInterval = setInterval(() => {
    // Accelerate to ~70%, then slow down
    const increment = value < 40 ? 3 : value < 70 ? 1.5 : value < 88 ? 0.5 : 0.1;
    value = Math.min(value + increment, 92);
    progressBar.style.width = value + '%';
  }, 300);
}

function stopProgress() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
  progressBar.style.width = '100%';
  setTimeout(() => { progressBar.style.width = '0%'; }, 500);
}

// ─── Compare Slider ───────────────────────────────────────────────────────────

function initCompareSlider() {
  let isDragging = false;

  function setPosition(clientX) {
    const rect = compareWrapper.getBoundingClientRect();
    let ratio = (clientX - rect.left) / rect.width;
    ratio = Math.min(1, Math.max(0, ratio));
    const pct = ratio * 100;

    compareBeforeWrap.style.width = pct + '%';
    compareHandle.style.left = pct + '%';

    // Keep before image full-width inside its clipping container
    compareBefore.style.width = compareWrapper.offsetWidth + 'px';
  }

  // Mouse
  compareWrapper.addEventListener('mousedown', (e) => {
    isDragging = true;
    setPosition(e.clientX);
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    setPosition(e.clientX);
  });

  document.addEventListener('mouseup', () => { isDragging = false; });

  // Touch
  compareWrapper.addEventListener('touchstart', (e) => {
    isDragging = true;
    setPosition(e.touches[0].clientX);
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    setPosition(e.touches[0].clientX);
  }, { passive: true });

  document.addEventListener('touchend', () => { isDragging = false; });

  // Initial position
  setPosition(compareWrapper.getBoundingClientRect().left + compareWrapper.offsetWidth * 0.5);
}

// ─── New Image ────────────────────────────────────────────────────────────────

btnNewImage.addEventListener('click', () => {
  // Reset all state
  originalFile    = null;
  originalDataUrl = null;
  resultUrl       = null;

  fileInput.value = '';
  originalImg.src = '';

  uploadArea.classList.remove('hidden');
  processingPanel.classList.add('hidden');

  hideError();
  resetResultState();

  // Scroll to upload area
  document.getElementById('tool-section').scrollIntoView({ behavior: 'smooth' });
});

// ─── Error Helpers ────────────────────────────────────────────────────────────

function showError(message) {
  errorMsg.textContent = message;
  errorToast.classList.remove('hidden');
}

function hideError() {
  errorToast.classList.add('hidden');
}

// ─── Smooth Scroll for nav links ──────────────────────────────────────────────

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
