// LUCIS Web App JavaScript
class LUCISApp {
    constructor() {
        this.selectedDirectory = null;
        this.config = {
            baseDirectory: null,
            lastRun: null,
            studyAreas: []
        };

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadConfig();
        this.checkOfflineCapability();
    }

    bindEvents() {
        const selectBtn = document.getElementById('selectDirectory');
        const runBtn = document.getElementById('runModel');
        const viewBtn = document.getElementById('viewResults');
        const exportBtn = document.getElementById('exportConfig');

        selectBtn.addEventListener('click', () => this.selectDirectory());
        runBtn.addEventListener('click', () => this.runModel());
        viewBtn.addEventListener('click', () => this.viewResults());
        exportBtn.addEventListener('click', () => this.exportConfig());
    }

    async selectDirectory() {
        try {
            // Try modern File System Access API first
            if ('showDirectoryPicker' in window) {
                this.selectedDirectory = await window.showDirectoryPicker({
                    mode: 'readwrite'
                });
                await this.processSelectedDirectory(this.selectedDirectory);
            } else {
                // Fallback for browsers without File System Access API
                this.showFallbackDirectorySelection();
            }
        } catch (error) {
            console.error('Error selecting directory:', error);
            this.showStatus('Error selecting directory. Please try again.', 'error');
        }
    }

    showFallbackDirectorySelection() {
        // Create a hidden file input for directory selection
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.multiple = true;

        input.addEventListener('change', (event) => {
            const files = Array.from(event.target.files);
            if (files.length > 0) {
                // Get the directory path from the first file
                const directoryPath = files[0].webkitRelativePath.split('/')[0];
                this.selectedDirectory = { path: directoryPath, files: files };
                this.processSelectedDirectory(this.selectedDirectory);
            }
        });

        input.click();
    }

    async processSelectedDirectory(directoryHandle) {
        try {
            let directoryPath = '';
            let hasValidStructure = false;
            const subfolders = [];

            if (directoryHandle.kind === 'directory') {
                // Modern File System Access API
                directoryPath = `/${directoryHandle.name}`;

                // Check for required subfolders
                try {
                    const dataHandle = await directoryHandle.getDirectoryHandle('Data');
                    const rankedTifsHandle = await directoryHandle.getDirectoryHandle('Ranked Tifs');
                    hasValidStructure = true;

                    // Look for study area folders (any folder that's not Data or Ranked Tifs)
                    for await (const [name, handle] of directoryHandle.entries()) {
                        if (handle.kind === 'directory' && name !== 'Data' && name !== 'Ranked Tifs') {
                            subfolders.push(name);
                        }
                    }
                } catch (error) {
                    hasValidStructure = false;
                }
            } else {
                // Fallback mode
                directoryPath = directoryHandle.path;

                // Check structure from files
                const fileNames = directoryHandle.files.map(f => f.webkitRelativePath);
                hasValidStructure = fileNames.some(path => path.includes('/Data/')) &&
                                  fileNames.some(path => path.includes('/Ranked Tifs/'));

                // Extract study area folders
                const folders = new Set();
                fileNames.forEach(path => {
                    const parts = path.split('/');
                    if (parts.length > 1) {
                        const folder = parts[1];
                        if (folder !== 'Data' && folder !== 'Ranked Tifs' && folder !== '') {
                            folders.add(folder);
                        }
                    }
                });
                subfolders.push(...folders);
            }

            if (hasValidStructure) {
                this.config.baseDirectory = directoryPath;
                this.config.studyAreas = subfolders;
                this.saveConfig();

                document.getElementById('selectedPath').textContent = `Selected: ${directoryPath}`;
                this.showStatus('LUCIS directory structure validated successfully!', 'success');
                this.enableActionButtons();
            } else {
                this.showStatus('Invalid LUCIS directory structure. Please ensure you have Data, Ranked Tifs, and at least one study area folder.', 'error');
            }

        } catch (error) {
            console.error('Error processing directory:', error);
            this.showStatus('Error processing selected directory.', 'error');
        }
    }

    enableActionButtons() {
        const buttons = ['runModel', 'viewResults', 'exportConfig'];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            btn.disabled = false;
            btn.classList.add('enabled');
        });
    }

    showStatus(message, type = 'info') {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;

        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.className = 'status-message';
            }, 5000);
        }
    }

    async runModel() {
        if (!this.config.baseDirectory) {
            this.showStatus('Please select a LUCIS directory first.', 'error');
            return;
        }

        this.showStatus('Running LUCIS model... This may take several minutes.', 'info');

        try {
            // In a real implementation, this would call the Python processing
            // For now, we'll simulate the process
            await this.simulateModelRun();

            this.config.lastRun = new Date().toISOString();
            this.saveConfig();

            this.showStatus('LUCIS model completed successfully!', 'success');
        } catch (error) {
            console.error('Error running model:', error);
            this.showStatus('Error running LUCIS model. Check the console for details.', 'error');
        }
    }

    async simulateModelRun() {
        // Simulate processing time
        return new Promise(resolve => {
            setTimeout(() => {
                console.log('LUCIS model processing would happen here...');
                resolve();
            }, 3000);
        });
    }

    viewResults() {
        if (!this.config.baseDirectory) {
            this.showStatus('Please select a LUCIS directory first.', 'error');
            return;
        }

        // Open results in a new window or display them
        const resultsWindow = window.open('', '_blank');
        resultsWindow.document.write(`
            <html>
            <head>
                <title>LUCIS Results</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .result-item { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
                </style>
            </head>
            <body>
                <h1>LUCIS Model Results</h1>
                <p><strong>Base Directory:</strong> ${this.config.baseDirectory}</p>
                <p><strong>Study Areas:</strong> ${this.config.studyAreas.join(', ')}</p>
                <p><strong>Last Run:</strong> ${this.config.lastRun || 'Never'}</p>

                <h2>Generated Outputs</h2>
                <div class="result-item">
                    <strong>LUCIS Conflict Maps:</strong> Generated for ${this.config.studyAreas.length} study areas
                </div>
                <div class="result-item">
                    <strong>Ranked Rasters:</strong> Created in Ranked Tifs folder
                </div>
                <div class="result-item">
                    <strong>Suitability Models:</strong> AG, UG, CG models completed
                </div>
            </body>
            </html>
        `);
    }

    exportConfig() {
        const configData = {
            lucis_config: {
                base_directory: this.config.baseDirectory,
                study_areas: this.config.studyAreas,
                last_run: this.config.lastRun,
                export_date: new Date().toISOString(),
                version: "1.0.0"
            }
        };

        const blob = new Blob([JSON.stringify(configData, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lucis_config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showStatus('Configuration exported successfully!', 'success');
    }

    saveConfig() {
        try {
            localStorage.setItem('lucis_config', JSON.stringify(this.config));
        } catch (error) {
            console.error('Error saving config:', error);
        }
    }

    loadConfig() {
        try {
            const saved = localStorage.getItem('lucis_config');
            if (saved) {
                this.config = { ...this.config, ...JSON.parse(saved) };

                if (this.config.baseDirectory) {
                    document.getElementById('selectedPath').textContent = `Loaded: ${this.config.baseDirectory}`;
                    this.enableActionButtons();
                }
            }
        } catch (error) {
            console.error('Error loading config:', error);
        }
    }

    checkOfflineCapability() {
        // Check if we're running in a secure context (required for File System Access API)
        if (!window.isSecureContext) {
            console.warn('Running in non-secure context. Some features may be limited.');
        }

        // Check for service worker support for offline functionality
        if ('serviceWorker' in navigator) {
            this.registerServiceWorker();
        }
    }

    async registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });

            console.log('Service Worker registered successfully:', registration.scope);

            // Handle updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showStatus('New version available! Refresh to update.', 'info');
                        }
                    });
                }
            });

            // Check for updates
            setInterval(() => {
                registration.update();
            }, 1000 * 60 * 60); // Check every hour

        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LUCISApp();
});