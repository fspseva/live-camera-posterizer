class LiveCameraPosterizer {
    constructor() {
        this.stream = null;
        this.isProcessing = false;
        this.animationId = null;
        
        // Settings
        this.steps = 4;
        this.pixelSize = 8;
        this.contrast = 1.0;
        this.resolution = 'medium';
        
        // Color customization
        this.stepColors = [];
        this.stepImages = [];
        this.stepTypes = []; // 'color' or 'image'
        this.selectedStep = -1;
        
        // Effects settings
        this.targetFPS = 30;
        this.colorFlashAmount = 0;
        this.frameCounter = 0;
        
        // Performance tracking
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.processingTimes = [];
        
        // Canvas contexts for optimization
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d');
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeStepData();
        this.updateStepsPreview();
    }

    initializeElements() {
        this.webcam = document.getElementById('webcam');
        this.outputCanvas = document.getElementById('outputCanvas');
        this.outputCtx = this.outputCanvas.getContext('2d');
        
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.snapshotBtn = document.getElementById('snapshotBtn');
        
        this.stepsSlider = document.getElementById('stepsSlider');
        this.stepsValue = document.getElementById('stepsValue');
        this.stepsPreview = document.getElementById('stepsPreview');
        this.pixelSizeSlider = document.getElementById('pixelSizeSlider');
        this.pixelSizeValue = document.getElementById('pixelSizeValue');
        this.contrastSlider = document.getElementById('contrastSlider');
        this.contrastValue = document.getElementById('contrastValue');
        this.resolutionSelect = document.getElementById('resolutionSelect');
        
        // Color editor elements
        this.colorEditor = document.getElementById('colorEditor');
        this.selectedStepIndex = document.getElementById('selectedStepIndex');
        this.colorSwatch = document.getElementById('colorSwatch');
        this.hueSlider = document.getElementById('hueSlider');
        this.hueValue = document.getElementById('hueValue');
        this.saturationSlider = document.getElementById('saturationSlider');
        this.saturationValue = document.getElementById('saturationValue');
        this.brightnessSlider = document.getElementById('brightnessSlider');
        this.brightnessValue = document.getElementById('brightnessValue');
        this.resetColorBtn = document.getElementById('resetColorBtn');
        this.resetAllColorsBtn = document.getElementById('resetAllColorsBtn');
        this.closeColorEditor = document.getElementById('closeColorEditor');
        this.randomColorsBtn = document.getElementById('randomColorsBtn');
        
        // Effects elements
        this.fpsSlider = document.getElementById('fpsSlider');
        this.fpsSliderValue = document.getElementById('fpsSliderValue');
        this.colorFlashSlider = document.getElementById('colorFlashSlider');
        this.colorFlashValue = document.getElementById('colorFlashValue');
        
        // Step type controls
        this.useColorRadio = document.getElementById('useColor');
        this.useImageRadio = document.getElementById('useImage');
        this.colorControls = document.getElementById('colorControls');
        this.imageControls = document.getElementById('imageControls');
        this.stepImageInput = document.getElementById('stepImageInput');
        this.imagePreview = document.getElementById('imagePreview');
        
        this.fpsCounter = document.getElementById('fpsCounter');
        this.processingTime = document.getElementById('processingTime');
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.stopBtn.addEventListener('click', () => this.stopCamera());
        this.snapshotBtn.addEventListener('click', () => this.takeSnapshot());
        
        this.stepsSlider.addEventListener('input', (e) => {
            this.steps = parseInt(e.target.value);
            this.stepsValue.textContent = this.steps;
            this.adjustStepData();
            this.updateStepsPreview();
            this.closeColorEditor.click();
        });
        
        this.pixelSizeSlider.addEventListener('input', (e) => {
            this.pixelSize = parseInt(e.target.value);
            this.pixelSizeValue.textContent = this.pixelSize;
        });
        
        this.contrastSlider.addEventListener('input', (e) => {
            this.contrast = parseFloat(e.target.value);
            this.contrastValue.textContent = this.contrast.toFixed(1);
        });
        
        this.resolutionSelect.addEventListener('change', (e) => {
            this.resolution = e.target.value;
            if (this.stream) {
                this.stopCamera();
                setTimeout(() => this.startCamera(), 100);
            }
        });
        
        // Color editor event listeners
        this.hueSlider.addEventListener('input', () => {
            console.log('Hue slider changed to:', this.hueSlider.value);
            this.updateColorFromHSB();
        });
        this.saturationSlider.addEventListener('input', () => {
            console.log('Saturation slider changed to:', this.saturationSlider.value);
            this.updateColorFromHSB();
        });
        this.brightnessSlider.addEventListener('input', () => {
            console.log('Brightness slider changed to:', this.brightnessSlider.value);
            this.updateColorFromHSB();
        });
        
        this.resetColorBtn.addEventListener('click', () => this.resetStepColor());
        this.resetAllColorsBtn.addEventListener('click', () => this.resetAllColors());
        this.closeColorEditor.addEventListener('click', () => this.closeColorEditorPanel());
        this.randomColorsBtn.addEventListener('click', () => this.randomizeAllColors());
        
        // Step type event listeners
        this.useColorRadio.addEventListener('change', () => this.toggleStepType());
        this.useImageRadio.addEventListener('change', () => this.toggleStepType());
        this.stepImageInput.addEventListener('change', (e) => this.handleStepImageUpload(e));
        
        // Effects event listeners
        this.fpsSlider.addEventListener('input', (e) => {
            this.targetFPS = parseInt(e.target.value);
            this.fpsSliderValue.textContent = this.targetFPS + ' FPS';
        });
        
        this.colorFlashSlider.addEventListener('input', (e) => {
            this.colorFlashAmount = parseInt(e.target.value);
            this.colorFlashValue.textContent = this.colorFlashAmount + '%';
        });
        
        window.addEventListener('resize', () => this.handleResize());
    }

    getResolutionConstraints() {
        const constraints = {
            low: { width: 160, height: 120 },
            medium: { width: 320, height: 240 },
            high: { width: 640, height: 480 },
            ultra: { width: 1280, height: 720 }
        };
        return constraints[this.resolution];
    }

    async startCamera() {
        try {
            const constraints = this.getResolutionConstraints();
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: constraints.width },
                    height: { ideal: constraints.height },
                    facingMode: 'user'
                }
            });
            
            this.webcam.srcObject = this.stream;
            await new Promise(resolve => this.webcam.onloadedmetadata = resolve);
            
            this.setupCanvas();
            this.startProcessing();
            
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.snapshotBtn.disabled = false;
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Could not access camera. Please check permissions.');
        }
    }

    setupCanvas() {
        const videoWidth = this.webcam.videoWidth;
        const videoHeight = this.webcam.videoHeight;
        
        this.outputCanvas.width = videoWidth;
        this.outputCanvas.height = videoHeight;
        
        this.tempCanvas.width = videoWidth;
        this.tempCanvas.height = videoHeight;
        
        this.handleResize();
    }

    handleResize() {
        const container = this.outputCanvas.parentElement;
        const containerWidth = container.clientWidth;
        const maxWidth = Math.min(400, containerWidth * 0.45);
        
        this.webcam.style.maxWidth = maxWidth + 'px';
        this.outputCanvas.style.maxWidth = maxWidth + 'px';
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.isProcessing = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.snapshotBtn.disabled = true;
    }

    startProcessing() {
        this.isProcessing = true;
        this.lastTime = performance.now();
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.frameCounter = 0;
        this.processFrame();
    }

    processFrame() {
        if (!this.isProcessing) return;
        
        const startTime = performance.now();
        
        // Calculate frame rate throttling
        const frameInterval = 1000 / this.targetFPS;
        if (startTime - this.lastFrameTime < frameInterval) {
            this.animationId = requestAnimationFrame(() => this.processFrame());
            return;
        }
        this.lastFrameTime = startTime;
        
        this.tempCtx.drawImage(this.webcam, 0, 0);
        const imageData = this.tempCtx.getImageData(0, 0, this.tempCanvas.width, this.tempCanvas.height);
        
        this.applyEffectsAndDithering(imageData);
        
        const endTime = performance.now();
        const processingTime = endTime - startTime;
        this.processingTimes.push(processingTime);
        if (this.processingTimes.length > 60) this.processingTimes.shift();
        
        this.updatePerformanceStats(endTime);
        this.frameCounter++;
        
        this.animationId = requestAnimationFrame(() => this.processFrame());
    }

    applyEffectsAndDithering(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Set output canvas size to match pixelated dimensions
        const outputWidth = Math.floor(width / this.pixelSize) * this.pixelSize;
        const outputHeight = Math.floor(height / this.pixelSize) * this.pixelSize;
        
        this.outputCanvas.width = outputWidth;
        this.outputCanvas.height = outputHeight;
        
        // Clear canvas
        this.outputCtx.fillStyle = '#000000';
        this.outputCtx.fillRect(0, 0, outputWidth, outputHeight);
        
        // Process each pixel block and draw current frame
        for (let y = 0; y < outputHeight; y += this.pixelSize) {
            for (let x = 0; x < outputWidth; x += this.pixelSize) {
                // Calculate average brightness of this block
                const blockBrightness = this.getBlockBrightness(data, x, y, width, height);
                const adjustedBrightness = this.applyContrast(blockBrightness);
                
                // Map brightness to step index
                let stepIndex = this.mapToStepIndex(adjustedBrightness);
                
                // Apply color flash effect
                if (this.colorFlashAmount > 0) {
                    stepIndex = this.applyColorFlash(stepIndex);
                }
                
                // Draw the stepped pixel block
                this.drawPixelBlock(x, y, stepIndex);
            }
        }
    }

    applyColorFlash(stepIndex) {
        // Flash effect: randomly change colors based on flash amount
        const flashChance = this.colorFlashAmount / 100;
        
        if (Math.random() < flashChance) {
            // Flash to a random step color
            return Math.floor(Math.random() * this.steps);
        }
        
        return stepIndex;
    }

    getBlockBrightness(data, startX, startY, width, height) {
        let totalBrightness = 0;
        let pixelCount = 0;
        
        // Sample pixels from the camera feed block
        for (let y = startY; y < Math.min(startY + this.pixelSize, height); y++) {
            for (let x = startX; x < Math.min(startX + this.pixelSize, width); x++) {
                const index = (y * width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                
                // Calculate luminance using proper weights for human vision
                const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
                totalBrightness += brightness;
                pixelCount++;
            }
        }
        
        // Return average brightness of this block (0-255 range)
        return pixelCount > 0 ? totalBrightness / pixelCount : 0;
    }

    applyContrast(brightness) {
        return Math.min(255, Math.max(0, (brightness - 128) * this.contrast + 128));
    }

    mapToStepIndex(brightness) {
        // Map brightness (0-255) to step index (0 to steps-1)
        const segmentSize = 255 / this.steps;
        const segmentIndex = Math.floor(brightness / segmentSize);
        return Math.min(segmentIndex, this.steps - 1);
    }

    drawPixelBlock(x, y, stepIndex) {
        if (this.stepTypes[stepIndex] === 'image' && this.stepImages[stepIndex]) {
            // Draw image for this step
            this.outputCtx.drawImage(
                this.stepImages[stepIndex], 
                x, y, 
                this.pixelSize, this.pixelSize
            );
        } else {
            // Use solid color for this step
            const color = this.stepColors[stepIndex];
            this.outputCtx.fillStyle = color;
            this.outputCtx.fillRect(x, y, this.pixelSize, this.pixelSize);
        }
    }

    updateStepsPreview() {
        this.stepsPreview.innerHTML = '';
        
        for (let i = 0; i < this.steps; i++) {
            const swatch = document.createElement('div');
            swatch.className = 'step-swatch';
            swatch.dataset.stepIndex = i;
            swatch.addEventListener('click', () => this.openColorEditor(i));
            
            if (this.stepTypes[i] === 'image' && this.stepImages[i]) {
                // Display image thumbnail
                swatch.style.backgroundImage = `url(${this.stepImages[i].src})`;
                swatch.style.backgroundSize = 'cover';
                swatch.style.backgroundPosition = 'center';
                swatch.style.backgroundColor = '';
            } else {
                // Display solid color
                swatch.style.backgroundColor = this.stepColors[i];
                swatch.style.backgroundImage = '';
            }
            
            this.stepsPreview.appendChild(swatch);
        }
    }

    initializeStepData() {
        this.stepColors = [];
        this.stepImages = [];
        this.stepTypes = [];
        
        for (let i = 0; i < this.steps; i++) {
            const grayValue = (i * 255) / (this.steps - 1);
            const hex = Math.round(grayValue).toString(16).padStart(2, '0');
            this.stepColors.push(`#${hex}${hex}${hex}`);
            this.stepImages.push(null);
            this.stepTypes.push('color');
        }
    }

    adjustStepData() {
        const oldColors = [...this.stepColors];
        const oldImages = [...this.stepImages];
        const oldTypes = [...this.stepTypes];
        
        this.stepColors = [];
        this.stepImages = [];
        this.stepTypes = [];
        
        for (let i = 0; i < this.steps; i++) {
            if (i < oldColors.length) {
                // Keep existing data
                this.stepColors.push(oldColors[i]);
                this.stepImages.push(oldImages[i]);
                this.stepTypes.push(oldTypes[i]);
            } else {
                // Add new grayscale step
                const grayValue = (i * 255) / (this.steps - 1);
                const hex = Math.round(grayValue).toString(16).padStart(2, '0');
                this.stepColors.push(`#${hex}${hex}${hex}`);
                this.stepImages.push(null);
                this.stepTypes.push('color');
            }
        }
    }

    openColorEditor(stepIndex) {
        this.selectedStep = stepIndex;
        this.selectedStepIndex.textContent = stepIndex + 1;
        
        // Update selected visual state
        document.querySelectorAll('.step-swatch').forEach((swatch, i) => {
            swatch.classList.toggle('selected', i === stepIndex);
        });
        
        // Set radio button based on step type
        if (this.stepTypes[stepIndex] === 'image') {
            this.useImageRadio.checked = true;
        } else {
            this.useColorRadio.checked = true;
        }
        
        // Update UI based on type
        this.toggleStepType();
        
        // Convert current color to HSB and update sliders
        const rgb = this.hexToRgb(this.stepColors[stepIndex]);
        const hsb = this.rgbToHsb(rgb.r, rgb.g, rgb.b);
        
        this.hueSlider.value = hsb.h;
        this.saturationSlider.value = hsb.s;
        this.brightnessSlider.value = hsb.b;
        
        this.updateHSBLabels();
        this.updateColorSwatch();
        
        // Update image preview if there's an image
        if (this.stepTypes[stepIndex] === 'image' && this.stepImages[stepIndex]) {
            this.imagePreview.innerHTML = `<img src="${this.stepImages[stepIndex].src}" alt="Step Image">`;
        } else {
            this.imagePreview.innerHTML = '';
        }
        
        this.colorEditor.style.display = 'block';
    }

    toggleStepType() {
        if (this.useImageRadio.checked) {
            this.colorControls.style.display = 'none';
            this.imageControls.style.display = 'block';
            if (this.selectedStep !== -1) {
                this.stepTypes[this.selectedStep] = 'image';
            }
        } else {
            this.colorControls.style.display = 'block';
            this.imageControls.style.display = 'none';
            if (this.selectedStep !== -1) {
                this.stepTypes[this.selectedStep] = 'color';
            }
        }
        
        if (this.selectedStep !== -1) {
            this.updateStepsPreview();
        }
    }

    async handleStepImageUpload(event) {
        const file = event.target.files[0];
        if (!file || this.selectedStep === -1) return;

        const img = new Image();
        await new Promise((resolve) => {
            img.onload = resolve;
            img.src = URL.createObjectURL(file);
        });

        this.stepImages[this.selectedStep] = img;
        this.stepTypes[this.selectedStep] = 'image';
        
        // Update preview
        this.imagePreview.innerHTML = `<img src="${img.src}" alt="Step Image">`;
        this.updateStepsPreview();
    }

    closeColorEditorPanel() {
        this.colorEditor.style.display = 'none';
        this.selectedStep = -1;
        document.querySelectorAll('.step-swatch').forEach(swatch => {
            swatch.classList.remove('selected');
        });
    }

    updateColorFromHSB() {
        if (this.selectedStep === -1) return;
        
        const h = parseInt(this.hueSlider.value);
        const s = parseInt(this.saturationSlider.value);
        const b = parseInt(this.brightnessSlider.value);
        
        console.log(`HSB Input: H=${h}, S=${s}, B=${b}`);
        
        const rgb = this.hsbToRgb(h, s, b);
        console.log(`RGB Output: R=${rgb.r}, G=${rgb.g}, B=${rgb.b}`);
        
        const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);
        console.log(`Hex Output: ${hex}`);
        
        this.stepColors[this.selectedStep] = hex;
        this.updateHSBLabels();
        this.updateColorSwatch();
        this.updateStepsPreview();
    }

    updateHSBLabels() {
        this.hueValue.textContent = this.hueSlider.value + '°';
        this.saturationValue.textContent = this.saturationSlider.value + '%';
        this.brightnessValue.textContent = this.brightnessSlider.value + '%';
    }

    updateColorSwatch() {
        if (this.selectedStep === -1) return;
        this.colorSwatch.style.backgroundColor = this.stepColors[this.selectedStep];
    }

    resetStepColor() {
        if (this.selectedStep === -1) return;
        
        // Reset to grayscale color and clear any image
        const grayValue = (this.selectedStep * 255) / (this.steps - 1);
        const hex = Math.round(grayValue).toString(16).padStart(2, '0');
        this.stepColors[this.selectedStep] = `#${hex}${hex}${hex}`;
        this.stepImages[this.selectedStep] = null;
        this.stepTypes[this.selectedStep] = 'color';
        
        // Switch to color mode
        this.useColorRadio.checked = true;
        this.toggleStepType();
        
        // Update sliders to match gray color
        const rgb = this.hexToRgb(this.stepColors[this.selectedStep]);
        const hsb = this.rgbToHsb(rgb.r, rgb.g, rgb.b);
        
        this.hueSlider.value = hsb.h;
        this.saturationSlider.value = hsb.s;
        this.brightnessSlider.value = hsb.b;
        
        this.updateHSBLabels();
        this.updateColorSwatch();
        this.updateStepsPreview();
        
        // Clear image preview
        this.imagePreview.innerHTML = '';
    }

    initializeStepColors() {
        for (let i = 0; i < this.steps; i++) {
            const grayValue = (i * 255) / (this.steps - 1);
            const hex = Math.round(grayValue).toString(16).padStart(2, '0');
            this.stepColors[i] = `#${hex}${hex}${hex}`;
        }
    }

    resetAllColors() {
        this.initializeStepData();
        this.updateStepsPreview();
        
        // If color editor is open, update it
        if (this.selectedStep !== -1) {
            // Switch to color mode
            this.useColorRadio.checked = true;
            this.toggleStepType();
            
            const rgb = this.hexToRgb(this.stepColors[this.selectedStep]);
            const hsb = this.rgbToHsb(rgb.r, rgb.g, rgb.b);
            
            this.hueSlider.value = hsb.h;
            this.saturationSlider.value = hsb.s;
            this.brightnessSlider.value = hsb.b;
            
            this.updateHSBLabels();
            this.updateColorSwatch();
            
            // Clear image preview
            this.imagePreview.innerHTML = '';
        }
    }

    randomizeAllColors() {
        console.log('Randomizing all colors!');
        
        for (let i = 0; i < this.steps; i++) {
            // Generate random HSB values with high saturation for vivid colors
            const h = Math.floor(Math.random() * 360); // Hue: 0-360°
            const s = Math.floor(Math.random() * 51) + 50; // Saturation: 50-100% (more vivid)
            const b = Math.floor(Math.random() * 41) + 60; // Brightness: 60-100% (avoid dark colors)
            
            console.log(`Generating color ${i}: H=${h}°, S=${s}%, B=${b}%`);
            
            // Convert to RGB and then to hex
            const rgb = this.hsbToRgb(h, s, b);
            const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);
            
            console.log(`RGB: ${rgb.r}, ${rgb.g}, ${rgb.b} → Hex: ${hex}`);
            
            this.stepColors[i] = hex;
            // Reset to color mode and clear any images
            this.stepImages[i] = null;
            this.stepTypes[i] = 'color';
        }
        
        // Force update the preview
        this.updateStepsPreview();
        
        // If color editor is open, update it to show the new color
        if (this.selectedStep !== -1) {
            // Switch to color mode
            this.useColorRadio.checked = true;
            this.toggleStepType();
            
            const rgb = this.hexToRgb(this.stepColors[this.selectedStep]);
            const hsb = this.rgbToHsb(rgb.r, rgb.g, rgb.b);
            
            this.hueSlider.value = hsb.h;
            this.saturationSlider.value = hsb.s;
            this.brightnessSlider.value = hsb.b;
            
            this.updateHSBLabels();
            this.updateColorSwatch();
            
            // Clear image preview
            this.imagePreview.innerHTML = '';
        }
        
        console.log('New step colors:', this.stepColors);
    }

    // Color conversion utilities
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    rgbToHsb(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        
        let h = 0;
        if (diff !== 0) {
            if (max === r) h = ((g - b) / diff) % 6;
            else if (max === g) h = (b - r) / diff + 2;
            else h = (r - g) / diff + 4;
        }
        h = Math.round(h * 60);
        if (h < 0) h += 360;
        
        const s = max === 0 ? 0 : Math.round((diff / max) * 100);
        const brightness = Math.round(max * 100);
        
        return { h, s, b: brightness };
    }

    hsbToRgb(h, s, b) {
        // Normalize values
        h = h % 360;
        s = Math.max(0, Math.min(100, s)) / 100;
        b = Math.max(0, Math.min(100, b)) / 100;
        
        const c = b * s;
        const h1 = h / 60;
        const x = c * (1 - Math.abs((h1 % 2) - 1));
        const m = b - c;
        
        let r = 0, g = 0, blue = 0;
        
        if (h1 >= 0 && h1 < 1) {
            r = c; g = x; blue = 0;
        } else if (h1 >= 1 && h1 < 2) {
            r = x; g = c; blue = 0;
        } else if (h1 >= 2 && h1 < 3) {
            r = 0; g = c; blue = x;
        } else if (h1 >= 3 && h1 < 4) {
            r = 0; g = x; blue = c;
        } else if (h1 >= 4 && h1 < 5) {
            r = x; g = 0; blue = c;
        } else if (h1 >= 5 && h1 < 6) {
            r = c; g = 0; blue = x;
        }
        
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((blue + m) * 255)
        };
    }


    updatePerformanceStats(currentTime) {
        this.frameCount++;
        
        if (currentTime - this.lastTime >= 1000) {
            const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
            const avgProcessingTime = this.processingTimes.length > 0 ? 
                Math.round(this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length) : 0;
            
            this.fpsCounter.textContent = `FPS: ${fps}`;
            this.processingTime.textContent = `Processing: ${avgProcessingTime}ms`;
            
            this.frameCount = 0;
            this.lastTime = currentTime;
        }
    }

    takeSnapshot() {
        const link = document.createElement('a');
        link.download = `posterized-snapshot-${Date.now()}.png`;
        link.href = this.outputCanvas.toDataURL();
        link.click();
    }
}


document.addEventListener('DOMContentLoaded', () => {
    new LiveCameraPosterizer();
});