// Enhanced Account Manager com melhorias de segurança e usabilidade
class AccountManager {
    constructor() {
        this.accounts = [];
        this.filteredAccounts = [];
        this.currentPage = 1;
        this.itemsPerPage = 6;
        this.currentFilename = null;
        this.hasUnsavedChanges = false;
        this.activities = [];
        this.backups = [];
        this.searchDebounceTimer = null;
        this.autoSaveInterval = null;
        this.confirmCallback = null;
        this.init();
    }

    async init() {
        try {
            this.loadFromLocalStorage();
            this.updateFileStatus();
            this.updateDashboard();
            this.renderAccounts();
            this.setupEventListeners();
            this.startAutoSave();
            this.logActivity('Aplicação iniciada');
        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.showAlert('Erro ao inicializar a aplicação', 'error');
        }
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('account-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addAccount();
        });

        // File handling
        document.getElementById('load-file-input').addEventListener('change', (e) => {
            this.handleFileLoad(e);
        });

        // Search and filters with debounce
        document.getElementById('search-accounts').addEventListener('input', (e) => {
            clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = setTimeout(() => {
                this.filterAccounts();
            }, 300);
        });

        ['filter-provider', 'filter-status'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.filterAccounts();
            });
        });

        // Password strength checking
        document.getElementById('password').addEventListener('input', (e) => {
            this.checkPasswordStrength(e.target.value);
        });

        // Form validation
        const inputs = document.querySelectorAll('input[required], select[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });

        // Modal handling
        document.getElementById('modal-cancel').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('confirmation-modal').addEventListener('click', (e) => {
            if (e.target.id === 'confirmation-modal') {
                this.hideModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
            }
            
            // Ctrl/Cmd + S para salvar
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (!document.getElementById('save-btn').disabled) {
                    this.saveFile();
                }
            }

            // Ctrl/Cmd + N para novo arquivo
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.createNewFile();
            }
        });

        // Auto-save warning
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'Você tem alterações não salvas. Deseja continuar?';
            }
        });

        // Visibility change handling
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.hasUnsavedChanges) {
                this.saveToLocalStorage();
            }
        });
    }

    // Validação de formulário aprimorada
    validateField(field) {
        const group = field.closest('.form-group');
        const errorElement = group?.querySelector('.error-message');
        let isValid = true;
        let errorMessage = '';

        if (!group || !errorElement) return true;

        // Limpar estado anterior
        group.classList.remove('invalid');
        errorElement.textContent = '';

        const value = field.value.trim();

        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'Este campo é obrigatório';
        } else if (field.type === 'email' && value) {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'E-mail inválido';
            } else if (field.id === 'email') {
                const editField = document.getElementById('edit-account-id');
                const editingId = editField?.value ? parseInt(editField.value) : null;
                
                if (this.accounts.some(acc => acc.email === value && acc.id !== editingId)) {
                    isValid = false;
                    errorMessage = 'Este e-mail já está cadastrado';
                }
            }
        } else if (field.id === 'password' && value) {
            if (value.length < 6) {
                isValid = false;
                errorMessage = 'A senha deve ter pelo menos 6 caracteres';
            }
        }

        if (!isValid) {
            group.classList.add('invalid');
            errorElement.textContent = errorMessage;
        }

        return isValid;
    }

    clearFieldError(field) {
        const group = field.closest('.form-group');
        if (field.value.trim() && group) {
            group.classList.remove('invalid');
            const errorElement = group.querySelector('.error-message');
            if (errorElement) {
                errorElement.textContent = '';
            }
        }
    }

    validateForm() {
        const requiredFields = document.querySelectorAll('#account-form input[required], #account-form select[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }

    // Verificação de força da senha melhorada
    checkPasswordStrength(password) {
        const strengthMeter = document.getElementById('password-strength-fill');
        const strengthText = document.getElementById('password-strength');
        
        if (!strengthMeter || !strengthText) return;

        let strength = 0;
        let feedback = [];

        // Critérios de força
        if (password.length >= 8) strength++;
        else feedback.push('pelo menos 8 caracteres');

        if (/[a-z]/.test(password)) strength++;
        else feedback.push('letras minúsculas');

        if (/[A-Z]/.test(password)) strength++;
        else feedback.push('letras maiúsculas');

        if (/[0-9]/.test(password)) strength++;
        else feedback.push('números');

        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        else feedback.push('símbolos especiais');

        // Verificar padrões comuns
        const commonPasswords = ['123456', 'password', 'admin', 'qwerty'];
        if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
            strength = Math.max(0, strength - 2);
            feedback.push('evite senhas comuns');
        }

        strengthMeter.className = 'strength-fill';
        
        let strengthLevel = '';
        let strengthColor = '';
        
        if (strength <= 2) {
            strengthMeter.classList.add('strength-weak');
            strengthLevel = 'Fraca';
            strengthColor = '#e74c3c';
        } else if (strength === 3) {
            strengthMeter.classList.add('strength-fair');
            strengthLevel = 'Razoável';
            strengthColor = '#f39c12';
        } else if (strength === 4) {
            strengthMeter.classList.add('strength-good');
            strengthLevel = 'Boa';
            strengthColor = '#66bb6a';
        } else {
            strengthMeter.classList.add('strength-strong');
            strengthLevel = 'Forte';
            strengthColor = '#27ae60';
        }

        const feedbackText = feedback.length > 0 
            ? `Adicione: ${feedback.join(', ')}`
            : 'Senha segura!';

        strengthText.innerHTML = `<span style="color: ${strengthColor}; font-weight: 600;">${strengthLevel}</span> - ${feedbackText}`;
    }

    // Alternância de visibilidade da senha
    togglePassword(fieldId) {
        const field = document.getElementById(fieldId);
        const toggle = field?.parentNode?.querySelector('.password-toggle');
        
        if (!field || !toggle) return;
        
        if (field.type === 'password') {
            field.type = 'text';
            toggle.textContent = '🙈';
            toggle.setAttribute('aria-label', 'Ocultar senha');
        } else {
            field.type = 'password';
            toggle.textContent = '👁️';
            toggle.setAttribute('aria-label', 'Mostrar senha');
        }
    }

    // Sistema de loading aprimorado
    showLoading(message = 'Processando...') {
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingMessage = document.getElementById('loading-message');
        
        if (loadingMessage) loadingMessage.textContent = message;
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    // Sistema de confirmação melhorado
    confirmAction(action, message, data = null) {
        const modal = document.getElementById('confirmation-modal');
        const messageElement = document.getElementById('modal-message');
        const confirmButton = document.getElementById('modal-confirm');
        
        if (!modal || !messageElement || !confirmButton) {
            // Fallback para confirm nativo se elementos não existirem
            if (confirm(message)) {
                if (typeof this[action] === 'function') {
                    this[action](data);
                } else if (typeof window[action] === 'function') {
                    window[action](data);
                }
            }
            return;
        }
        
        messageElement.textContent = message;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Store callback for confirmation
        this.confirmCallback = () => {
            this.hideModal();
            if (typeof this[action] === 'function') {
                this[action](data);
            } else if (typeof window[action] === 'function') {
                window[action](data);
            }
        };
        
        confirmButton.onclick = this.confirmCallback;
    }

    hideModal() {
        const modal = document.getElementById('confirmation-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
        this.confirmCallback = null;
    }

    // Controle de alterações
    markAsModified() {
        this.hasUnsavedChanges = true;
        this.updateFileStatus();
        
        const saveBtn = document.getElementById('save-btn');
        const saveAsBtn = document.getElementById('save-as-btn');
        const exportBtn = document.getElementById('export-btn');
        
        if (saveBtn) saveBtn.disabled = false;
        if (saveAsBtn) saveAsBtn.disabled = false;
        if (exportBtn) exportBtn.disabled = false;
        
        this.saveToLocalStorage();
    }

    markAsSaved() {
        this.hasUnsavedChanges = false;
        this.updateFileStatus();
    }

    // Auto-save local
    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            if (this.hasUnsavedChanges) {
                this.saveToLocalStorage();
                console.log('Auto-save executado');
            }
        }, 30000); // Auto-save a cada 30 segundos
    }

    saveToLocalStorage() {
        try {
            const data = {
                accounts: this.accounts,
                activities: this.activities,
                currentFilename: this.currentFilename,
                lastSaved: new Date().toISOString()
            };
            localStorage.setItem('accountManager', JSON.stringify(data));
        } catch (error) {
            console.error('Erro ao salvar no localStorage:', error);
        }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('accountManager');
            if (saved) {
                const data = JSON.parse(saved);
                this.accounts = data.accounts || [];
                this.activities = data.activities || [];
                this.currentFilename = data.currentFilename;
                
                // Verificar se há dados não salvos
                if (data.lastSaved && this.accounts.length > 0) {
                    this.hasUnsavedChanges = true;
                }
            }
        } catch (error) {
            console.error('Erro ao carregar do localStorage:', error);
        }
    }

    // Gerenciamento de arquivos aprimorado
    createNewFile() {
        if (this.hasUnsavedChanges) {
            this.confirmAction('executeNewFile', 'Você tem alterações não salvas. Criar novo arquivo irá descartá-las. Continuar?');
            return;
        }
        this.executeNewFile();
    }

    executeNewFile() {
        this.accounts = [];
        this.filteredAccounts = [];
        this.activities = [];
        this.currentFilename = null;
        this.hasUnsavedChanges = false;
        
        this.filterAccounts();
        this.updateDashboard();
        this.updateFileStatus();
        this.logActivity('Novo arquivo criado');
        this.showAlert('Novo arquivo criado com sucesso!', 'success');
        
        // Limpar localStorage
        localStorage.removeItem('accountManager');
    }

    loadFile() {
        if (this.hasUnsavedChanges) {
            this.confirmAction('executeLoadFile', 'Você tem alterações não salvas. Carregar novo arquivo irá descartá-las. Continuar?');
            return;
        }
        this.executeLoadFile();
    }

    executeLoadFile() {
        const input = document.getElementById('load-file-input');
        if (input) input.click();
    }

    async handleFileLoad(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.showLoading('Carregando arquivo...');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (this.validateFileStructure(data)) {
                    this.accounts = data.accounts || [];
                    this.activities = data.activities || [];
                    this.currentFilename = file.name.replace(/\.(json|ema)$/, '');
                    this.hasUnsavedChanges = false;
                    
                    this.filterAccounts();
                    this.updateDashboard();
                    this.updateFileStatus();
                    this.hideLoading();
                    this.showAlert(`Arquivo "${file.name}" carregado com sucesso!`, 'success');
                    this.logActivity(`Arquivo ${file.name} carregado (${this.accounts.length} contas)`);
                    
                    // Salvar no localStorage
                    this.saveToLocalStorage();
                } else {
                    throw new Error('Estrutura de arquivo inválida');
                }
            } catch (error) {
                this.hideLoading();
                this.showAlert(`Erro ao carregar arquivo: ${error.message}`, 'error');
                console.error('Erro no carregamento:', error);
            }
        };
        
        reader.onerror = () => {
            this.hideLoading();
            this.showAlert('Erro ao ler o arquivo', 'error');
        };
        
        reader.readAsText(file);
        event.target.value = '';
    }

    validateFileStructure(data) {
        if (!data || typeof data !== 'object') return false;
        if (!Array.isArray(data.accounts)) return false;
        
        // Validar estrutura das contas
        return data.accounts.every(account => 
            account.id && 
            account.email && 
            account.password && 
            account.provider
        );
    }

    saveFile() {
        if (!this.currentFilename) {
            this.saveAsFile();
            return;
        }
        this.downloadFile(this.currentFilename);
    }

    saveAsFile() {
        const filename = prompt('Nome do arquivo:', this.currentFilename || `minhas-contas-${new Date().toISOString().split('T')[0]}`);
        if (filename) {
            this.currentFilename = filename;
            this.downloadFile(filename);
        }
    }

    exportData() {
        const formats = prompt('Escolha o formato:\n1 - JSON padrão\n2 - CSV\n3 - JSON criptografado', '1');
        
        switch (formats) {
            case '1':
                this.downloadFile(this.currentFilename || 'export', 'json');
                break;
            case '2':
                this.exportCSV();
                break;
            case '3':
                this.exportEncrypted();
                break;
            default:
                this.showAlert('Formato inválido', 'warning');
        }
    }

    exportCSV() {
        const csvContent = [
            ['Email', 'Nome', 'Provedor', 'Status', '2FA', 'Data Criação'].join(','),
            ...this.accounts.map(acc => [
                `"${acc.email}"`,
                `"${acc.name || ''}"`,
                `"${acc.provider}"`,
                `"${acc.status}"`,
                `"${acc.enable2fa ? 'Sim' : 'Não'}"`,
                `"${new Date(acc.createdAt).toLocaleDateString()}"`
            ].join(','))
        ].join('\n');

        this.downloadBlob(csvContent, `${this.currentFilename || 'contas'}.csv`, 'text/csv');
    }

    downloadFile(filename, format = 'json') {
        this.showLoading('Preparando arquivo...');
        
        const data = {
            accounts: this.accounts,
            activities: this.activities,
            exportDate: new Date().toISOString(),
            version: '3.1',
            totalAccounts: this.accounts.length,
            securityInfo: {
                hasEncryption: false,
                exportedBy: 'Account Manager v3.1'
            }
        };
        
        setTimeout(() => {
            const content = JSON.stringify(data, null, 2);
            this.downloadBlob(content, `${filename}.${format}`, 'application/json');
            
            this.markAsSaved();
            this.hideLoading();
            this.logActivity(`Arquivo ${filename}.${format} salvo`);
            this.showAlert(`Arquivo "${filename}.${format}" salvo com sucesso!`, 'success');
        }, 1000);
    }

    downloadBlob(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Atualização do status do arquivo
    updateFileStatus() {
        const statusElement = document.getElementById('file-status');
        const fileInfoElement = document.getElementById('file-info');
        
        if (!statusElement) return;
        
        if (this.currentFilename || this.accounts.length > 0) {
            const status = this.hasUnsavedChanges ? 'modified' : 'loaded';
            statusElement.className = `file-status ${status}`;
            
            const statusText = this.hasUnsavedChanges ? '(modificado)' : '(salvo)';
            const filename = this.currentFilename || 'Novo arquivo';
            
            statusElement.innerHTML = `
                <p>📄 ${filename}.json ${statusText}</p>
                <small>${this.accounts.length} contas • ${this.formatFileSize()}</small>
            `;
            
            if (this.currentFilename && fileInfoElement) {
                fileInfoElement.style.display = 'block';
                this.updateElement('current-filename', `${this.currentFilename}.json`);
                this.updateElement('last-modified', this.hasUnsavedChanges ? 'Modificado agora' : 'Salvo');
                this.updateElement('file-account-count', this.accounts.length);
                this.updateElement('file-size', this.formatFileSize());
            } else if (fileInfoElement) {
                fileInfoElement.style.display = 'none';
            }
        } else {
            statusElement.className = 'file-status';
            statusElement.innerHTML = `
                <p>📄 Nenhum arquivo carregado</p>
                <small>Crie um novo arquivo ou carregue um existente para começar</small>
            `;
            if (fileInfoElement) fileInfoElement.style.display = 'none';
        }
        
        this.updateButtonStates();
    }

    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) element.textContent = content;
    }

    updateButtonStates() {
        const saveBtn = document.getElementById('save-btn');
        const saveAsBtn = document.getElementById('save-as-btn');
        const exportBtn = document.getElementById('export-btn');
        
        if (saveBtn) saveBtn.disabled = !this.hasUnsavedChanges && !!this.currentFilename;
        if (saveAsBtn) saveAsBtn.disabled = this.accounts.length === 0;
        if (exportBtn) exportBtn.disabled = this.accounts.length === 0;
    }

    formatFileSize() {
        const dataStr = JSON.stringify({ accounts: this.accounts, activities: this.activities });
        const bytes = new Blob([dataStr]).size;
        
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    // Adição de conta melhorada
async addAccount() {
    // Obter valores diretamente dos elementos
    const email = document.getElementById('email')?.value?.trim();
    const password = document.getElementById('password')?.value;
    const provider = document.getElementById('provider')?.value;
    const name = document.getElementById('name')?.value?.trim();
    const notes = document.getElementById('notes')?.value?.trim();
    const enable2fa = document.getElementById('enable-2fa')?.checked || false;
    const isPrimary = document.getElementById('is-primary')?.checked || false;

    console.log('Dados coletados:', { email, password, provider, name, notes, enable2fa, isPrimary });

    // Validação básica
    if (!email || !password || !provider) {
        this.showAlert('E-mail, senha e provedor são obrigatórios', 'error');
        return;
    }

    // Verificar se é modo de edição
    const editField = document.getElementById('edit-account-id');
    if (editField && editField.value) {
        const index = this.accounts.findIndex(acc => acc.id === parseInt(editField.value));
        if (index !== -1) {
            // Atualizar conta existente
            this.accounts[index] = {
                ...this.accounts[index],
                email: email,
                password: password,
                provider: provider,
                name: name || email.split('@')[0],
                notes: notes || '',
                enable2fa: enable2fa,
                isPrimary: isPrimary,
                securityScore: this.calculateSecurityScore(password, enable2fa)
            };
            this.markAsModified();
            this.filterAccounts();
            this.updateDashboard();
            this.clearForm();
            this.showAlert('Conta atualizada com sucesso!', 'success');
            this.logActivity(`Conta ${email} atualizada`);
            return;
        }
    }

    // Verificar email duplicado
    const emailExists = this.accounts.some(acc => 
        acc.email.toLowerCase() === email.toLowerCase()
    );
    
    if (emailExists) {
        this.showAlert('Este e-mail já está cadastrado', 'error');
        return;
    }

    this.showLoading('Adicionando conta...');

    try {
        const account = {
            id: Date.now() + Math.random(),
            email: email,
            password: password,
            provider: provider,
            name: name || email.split('@')[0],
            notes: notes || '',
            enable2fa: enable2fa,
            isPrimary: isPrimary,
            createdAt: new Date().toISOString(),
            lastLogin: null,
            status: 'offline',
            loginCount: 0,
            securityScore: this.calculateSecurityScore(password, enable2fa)
        };

        this.accounts.push(account);
        this.markAsModified();
        this.filterAccounts();
        this.updateDashboard();
        
        setTimeout(() => {
            this.hideLoading();
            this.showAlert('Conta adicionada com sucesso!', 'success');
            this.clearForm();
            this.logActivity(`Conta ${account.email} adicionada (${account.provider})`);
        }, 500);
        
    } catch (error) {
        this.hideLoading();
        this.showAlert(`Erro ao adicionar conta: ${error.message}`, 'error');
        console.error('Erro na adição:', error);
    }
}

    calculateSecurityScore(password, has2fa) {
        let score = 0;
        
        // Critérios de senha (60 pontos máximo)
        if (password.length >= 8) score += 15;
        if (password.length >= 12) score += 10;
        if (/[a-z]/.test(password)) score += 5;
        if (/[A-Z]/.test(password)) score += 5;
        if (/[0-9]/.test(password)) score += 10;
        if (/[^a-zA-Z0-9]/.test(password)) score += 15;
        
        // 2FA (40 pontos)
        if (has2fa) score += 40;
        
        return Math.min(100, score);
    }

    // Exclusão de conta com confirmação dupla
    async deleteAccount(id) {
        const account = this.accounts.find(acc => acc.id === id);
        if (!account) return;

        // Primeira confirmação
        if (!confirm(`Tem certeza que deseja excluir a conta "${account.email}"?`)) return;
        
        // Segunda confirmação para segurança
        const confirmation = prompt('Para confirmar, digite "EXCLUIR" (em maiúsculas):');
        if (confirmation !== 'EXCLUIR') {
            this.showAlert('Exclusão cancelada', 'info');
            return;
        }

        this.showLoading('Excluindo conta...');

        setTimeout(() => {
            this.accounts = this.accounts.filter(acc => acc.id !== id);
            this.markAsModified();
            this.filterAccounts();
            this.updateDashboard();
            this.hideLoading();
            this.showAlert('Conta excluída com sucesso!', 'success');
            this.logActivity(`Conta ${account.email} excluída`);
        }, 500);
    }

    // Alternância de status da conta
    async toggleAccountStatus(id) {
        const account = this.accounts.find(acc => acc.id === id);
        if (!account) return;

        this.showLoading(`${account.status === 'online' ? 'Desconectando' : 'Conectando'}...`);

        setTimeout(() => {
            account.status = account.status === 'online' ? 'offline' : 'online';
            if (account.status === 'online') {
                account.lastLogin = new Date().toISOString();
                account.loginCount = (account.loginCount || 0) + 1;
            }
            
            this.markAsModified();
            this.filterAccounts();
            this.updateDashboard();
            this.hideLoading();
            this.logActivity(`${account.email} está agora ${account.status}`);
        }, 800);
    }

    // Operações em lote
    async loginAllAccounts() {
        this.showLoading('Conectando todas as contas...');
        
        let connected = 0;
        const totalAccounts = this.accounts.length;
        
        if (totalAccounts === 0) {
            this.hideLoading();
            this.showAlert('Nenhuma conta disponível para conectar', 'info');
            return;
        }
        
        for (let i = 0; i < totalAccounts; i++) {
            setTimeout(() => {
                const account = this.accounts[i];
                if (account.status !== 'online') {
                    account.status = 'online';
                    account.lastLogin = new Date().toISOString();
                    account.loginCount = (account.loginCount || 0) + 1;
                    connected++;
                }
                
                if (i === totalAccounts - 1) {
                    this.markAsModified();
                    this.filterAccounts();
                    this.updateDashboard();
                    this.hideLoading();
                    this.logActivity(`${connected} contas conectadas simultaneamente`);
                    this.showAlert(`${connected} contas conectadas com sucesso`, 'success');
                }
            }, i * 200); // Delay escalonado para simular conexões reais
        }
    }

    async logoutAllAccounts() {
        this.showLoading('Desconectando todas as contas...');
        
        setTimeout(() => {
            const disconnected = this.accounts.filter(acc => acc.status === 'online').length;
            this.accounts.forEach(account => {
                account.status = 'offline';
            });
            
            this.markAsModified();
            this.filterAccounts();
            this.updateDashboard();
            this.hideLoading();
            this.logActivity(`${disconnected} contas desconectadas`);
            this.showAlert(`${disconnected} contas desconectadas`, 'success');
        }, 1000);
    }

    // Verificação de status simulada
    async checkAccountStatus() {
        this.showLoading('Verificando status das contas...');
        
        if (this.accounts.length === 0) {
            this.hideLoading();
            this.showAlert('Nenhuma conta disponível para verificar', 'info');
            return;
        }
        
        const updates = [];
        this.accounts.forEach((account, index) => {
            setTimeout(() => {
                const previousStatus = account.status;
                // Simular verificação real com probabilidades
                account.status = Math.random() > 0.2 ? 'online' : 'offline';
                
                if (previousStatus !== account.status) {
                    updates.push(`${account.email}: ${previousStatus} → ${account.status}`);
                }
                
                if (index === this.accounts.length - 1) {
                    this.markAsModified();
                    this.filterAccounts();
                    this.updateDashboard();
                    this.hideLoading();
                    
                    if (updates.length > 0) {
                        this.logActivity(`Status atualizado para ${updates.length} contas`);
                        this.showAlert(`${updates.length} contas tiveram status alterado`, 'info');
                    } else {
                        this.showAlert('Nenhuma alteração de status detectada', 'info');
                    }
                }
            }, index * 300);
        });
    }

    // Sistema de cópia aprimorado
    async copyToClipboard(text, type) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast(`✅ ${type} copiado!`);
        } catch (error) {
            // Fallback para navegadores mais antigos
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                this.showToast(`✅ ${type} copiado!`);
            } catch (fallbackError) {
                this.showToast(`❌ Erro ao copiar ${type}`, 'error');
            } finally {
                document.body.removeChild(textArea);
            }
        }
    }

    // Sistema de toast melhorado
    showToast(message, type = 'info') {
        // Criar toast se não existir
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        
        toast.textContent = message;
        toast.className = `toast show toast-${type}`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Alternância de visibilidade da senha nas contas
    togglePasswordVisibility(accountId) {
        const passwordDisplay = document.getElementById(`password-${accountId}`);
        const toggleBtn = document.getElementById(`toggle-${accountId}`);
        const account = this.accounts.find(acc => acc.id === accountId);
        
        if (!account || !passwordDisplay) return;
        
        if (passwordDisplay.classList.contains('password-hidden')) {
            passwordDisplay.innerHTML = `
                ${account.password}
                <button class="copy-btn" onclick="accountManager.copyToClipboard('${account.password}', 'Senha')" title="Copiar senha">📋</button>
            `;
            passwordDisplay.classList.remove('password-hidden');
            if (toggleBtn) {
                toggleBtn.textContent = '🙈';
                toggleBtn.title = 'Ocultar senha';
            }
        } else {
            passwordDisplay.innerHTML = `
                ••••••••••••
                <button class="copy-btn" onclick="accountManager.copyToClipboard('${account.password}', 'Senha')" title="Copiar senha">📋</button>
            `;
            passwordDisplay.classList.add('password-hidden');
            if (toggleBtn) {
                toggleBtn.textContent = '👁️';
                toggleBtn.title = 'Mostrar senha';
            }
        }
    }

    // Sistema de filtros aprimorado
    filterAccounts() {
        const searchInput = document.getElementById('search-accounts');
        const providerFilter = document.getElementById('filter-provider');
        const statusFilter = document.getElementById('filter-status');
        
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const providerValue = providerFilter ? providerFilter.value : '';
        const statusValue = statusFilter ? statusFilter.value : '';

        this.filteredAccounts = this.accounts.filter(account => {
            const matchesSearch = !searchTerm || 
                account.email.toLowerCase().includes(searchTerm) ||
                account.name.toLowerCase().includes(searchTerm) ||
                account.provider.toLowerCase().includes(searchTerm) ||
                (account.notes && account.notes.toLowerCase().includes(searchTerm));
            
            const matchesProvider = !providerValue || account.provider === providerValue;
            const matchesStatus = !statusValue || account.status === statusValue;
            
            return matchesSearch && matchesProvider && matchesStatus;
        });

        this.currentPage = 1;
        this.renderAccounts();
        this.renderPagination();
    }

    // Renderização de contas melhorada
    renderAccounts() {
        const container = document.getElementById('accounts-container');
        
        if (!container) return;
        
        if (this.filteredAccounts.length === 0) {
            container.innerHTML = this.accounts.length === 0 
                ? this.renderEmptyState('Nenhuma conta cadastrada', 'Adicione sua primeira conta para começar', '👥')
                : this.renderEmptyState('Nenhuma conta encontrada', 'Tente ajustar os filtros de pesquisa', '🔍');
            return;
        }

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const accountsToShow = this.filteredAccounts.slice(startIndex, endIndex);

        container.innerHTML = accountsToShow.map(account => this.renderAccountCard(account)).join('');
    }

    renderEmptyState(title, subtitle, icon) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">${icon}</div>
                <h3>${title}</h3>
                <p>${subtitle}</p>
            </div>
        `;
    }

    renderAccountCard(account) {
        const displayName = account.name || account.email.split('@')[0];
        const providerClass = `provider-${account.provider}`;
        const statusClass = account.status;
        const securityBadge = this.getSecurityBadge(account.securityScore);
        const lastLoginText = account.lastLogin 
            ? new Date(account.lastLogin).toLocaleString()
            : 'Nunca';

        return `
            <div class="account-card ${statusClass}">
                <div class="account-header">
                    <div class="account-info">
                        <div class="account-email">${account.name}</div>
                        <div class="account-name">${account.email}</div>
                        <span class="account-provider ${providerClass}">${account.provider.toUpperCase()}</span>
                    </div>
                    <div>
                        <span class="status-indicator ${account.status === 'online' ? 'status-online' : 'status-offline'}" 
                              title="Status: ${account.status}"></span>
                        ${securityBadge}
                    </div>
                </div>
                
                <div class="account-details">
                    <div class="detail-row">
                        <span class="detail-label">E-mail:</span>
                        <div class="detail-value">
                            ${account.email}
                            <button class="copy-btn" onclick="accountManager.copyToClipboard('${account.email}', 'E-mail')" title="Copiar e-mail">📋</button>
                        </div>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Senha:</span>
                        <div class="detail-value">
                            <div class="password-display password-hidden" id="password-${account.id}">
                                ••••••••••••
                                <button class="copy-btn" onclick="accountManager.copyToClipboard('${account.password}', 'Senha')" title="Copiar senha">📋</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">2FA:</span>
                        <span class="detail-value">${account.enable2fa ? '🔒 Ativado' : '🔓 Desativado'}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Último login:</span>
                        <span class="detail-value">${lastLoginText}</span>
                    </div>
                    
                    ${account.notes ? `
                    <div class="detail-row">
                        <span class="detail-label">Notas:</span>
                        <span class="detail-value">${account.notes}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="account-actions">
                    <button class="btn btn-sm btn-info" onclick="accountManager.togglePasswordVisibility(${account.id})" 
                            id="toggle-${account.id}" title="Mostrar/ocultar senha">
                        👁️ Senha
                    </button>
                    <button class="btn btn-sm ${account.status === 'online' ? 'btn-secondary' : 'btn-success'}" 
                            onclick="accountManager.toggleAccountStatus(${account.id})" 
                            title="Alterar status da conta">
                        ${account.status === 'online' ? '🚪 Desconectar' : '🔑 Conectar'}
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="accountManager.editAccount(${account.id})" 
                            title="Editar conta">
                        ✏️ Editar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="accountManager.confirmAction('deleteAccount', 'Excluir a conta ${account.email}?', ${account.id})" 
                            title="Excluir conta">
                        🗑️ Excluir
                    </button>
                </div>
            </div>
        `;
    }

    getSecurityBadge(score) {
        if (score >= 90) return '<span style="color: #27ae60; font-weight: bold;" title="Segurança excelente">🛡️</span>';
        if (score >= 70) return '<span style="color: #66bb6a; font-weight: bold;" title="Segurança boa">🔒</span>';
        if (score >= 50) return '<span style="color: #f39c12; font-weight: bold;" title="Segurança média">⚠️</span>';
        return '<span style="color: #e74c3c; font-weight: bold;" title="Segurança baixa">🔓</span>';
    }

    // Edição de conta (nova funcionalidade)
editAccount(id) {
    const account = this.accounts.find(acc => acc.id === id);
    if (!account) return;

    // Preencher formulário com dados da conta
    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');
    const providerField = document.getElementById('provider');
    const nameField = document.getElementById('name');
    const notesField = document.getElementById('notes');
    
    if (emailField) emailField.value = account.email;
    if (passwordField) passwordField.value = account.password;
    if (providerField) providerField.value = account.provider;
    if (nameField) nameField.value = account.name || '';
    if (notesField) notesField.value = account.notes || '';
    
    const enable2fa = document.getElementById('enable-2fa');
    const isPrimary = document.getElementById('is-primary');
    
    if (enable2fa) enable2fa.checked = account.enable2fa;
    if (isPrimary) isPrimary.checked = account.isPrimary;

    // Adicionar campo oculto para identificar edição
    let editField = document.getElementById('edit-account-id');
    if (!editField) {
        editField = document.createElement('input');
        editField.type = 'hidden';
        editField.id = 'edit-account-id';
        const form = document.getElementById('account-form');
        if (form) form.appendChild(editField);
    }
    editField.value = id;

    // Alterar texto do botão
    const submitBtn = document.querySelector('#account-form button[type="submit"]');
    if (submitBtn) submitBtn.innerHTML = '✏️ Atualizar Conta';

    // Mudar para aba de adicionar conta
    switchTab('add-account');
    const tabButton = document.querySelector('.tab[onclick*="add-account"]');
    if (tabButton) tabButton.scrollIntoView();

    this.showAlert('Editando conta. Modifique os campos desejados e clique em "Atualizar Conta".', 'info');
}

    // Paginação melhorada
    renderPagination() {
        const container = document.getElementById('pagination');
        if (!container) return;
        
        const totalPages = Math.ceil(this.filteredAccounts.length / this.itemsPerPage);
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = `
            <button ${this.currentPage === 1 ? 'disabled' : ''} 
                    onclick="accountManager.goToPage(${this.currentPage - 1})" 
                    title="Página anterior">❮</button>
        `;

        // Lógica de paginação inteligente
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || 
                i === totalPages || 
                (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `
                    <button class="${i === this.currentPage ? 'active' : ''}" 
                            onclick="accountManager.goToPage(${i})"
                            title="Página ${i}"
                            ${i === this.currentPage ? 'aria-current="page"' : ''}>${i}</button>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += '<span>...</span>';
            }
        }

        paginationHTML += `
            <button ${this.currentPage === totalPages ? 'disabled' : ''} 
                    onclick="accountManager.goToPage(${this.currentPage + 1})" 
                    title="Próxima página">❯</button>
        `;

        container.innerHTML = paginationHTML;
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredAccounts.length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.renderAccounts();
        this.renderPagination();
        
        // Scroll suave para o topo das contas
        const accountsContainer = document.getElementById('accounts-container');
        if (accountsContainer) {
            accountsContainer.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    }

    // Dashboard aprimorado
    updateDashboard() {
        const totalAccounts = this.accounts.length;
        const activeAccounts = this.accounts.filter(acc => acc.status === 'online').length;
        const uniqueProviders = new Set(this.accounts.map(acc => acc.provider)).size;
        const avgSecurity = totalAccounts > 0 
            ? Math.round(this.accounts.reduce((sum, acc) => sum + (acc.securityScore || 0), 0) / totalAccounts)
            : 0;

        this.updateElement('total-accounts', totalAccounts);
        this.updateElement('active-accounts', activeAccounts);
        this.updateElement('provider-count', uniqueProviders);
        this.updateElement('security-score', `${avgSecurity}%`);

        this.renderActivityLog();
        this.updateFileStatus();
        this.updateBackupStats();
    }

    // Relatório de segurança (nova funcionalidade)
    generateSecurityReport() {
        const weakPasswords = this.accounts.filter(acc => (acc.securityScore || 0) < 50);
        const no2FA = this.accounts.filter(acc => !acc.enable2fa);
        const duplicateProviders = this.findDuplicateProviders();

        let report = '🛡️ RELATÓRIO DE SEGURANÇA\n\n';
        
        report += `📊 RESUMO:\n`;
        report += `• Total de contas: ${this.accounts.length}\n`;
        report += `• Contas com senhas fracas: ${weakPasswords.length}\n`;
        report += `• Contas sem 2FA: ${no2FA.length}\n`;
        report += `• Provedores duplicados: ${duplicateProviders.length}\n\n`;

        if (weakPasswords.length > 0) {
            report += `⚠️ SENHAS FRACAS:\n`;
            weakPasswords.forEach(acc => {
                report += `• ${acc.email} (${acc.securityScore || 0}% segurança)\n`;
            });
            report += '\n';
        }

        if (no2FA.length > 0) {
            report += `🔓 CONTAS SEM 2FA:\n`;
            no2FA.forEach(acc => {
                report += `• ${acc.email}\n`;
            });
            report += '\n';
        }

        report += `💡 RECOMENDAÇÕES:\n`;
        report += `• Use senhas com pelo menos 12 caracteres\n`;
        report += `• Ative 2FA em todas as contas\n`;
        report += `• Use senhas únicas para cada conta\n`;
        report += `• Atualize senhas regularmente\n`;

        // Mostrar relatório em modal ou nova janela
        const newWindow = window.open('', '_blank');
        newWindow.document.write(`
            <html>
                <head><title>Relatório de Segurança</title></head>
                <body style="font-family: monospace; white-space: pre-wrap; margin: 20px;">
                    ${report}
                </body>
            </html>
        `);

        this.logActivity('Relatório de segurança gerado');
    }

    findDuplicateProviders() {
        const providerCounts = {};
        this.accounts.forEach(acc => {
            providerCounts[acc.provider] = (providerCounts[acc.provider] || 0) + 1;
        });
        
        return Object.entries(providerCounts)
            .filter(([provider, count]) => count > 1)
            .map(([provider, count]) => ({ provider, count }));
    }

    // Sistema de atividades melhorado
    logActivity(message) {
        this.activities.unshift({
            id: Date.now(),
            message,
            timestamp: new Date().toLocaleString(),
            type: 'info'
        });
        
        // Manter apenas os últimos 50 registros
        this.activities.splice(50);
        this.renderActivityLog();
    }

    renderActivityLog() {
        const container = document.getElementById('activity-log');
        if (!container) return;
        
        if (this.activities.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Nenhuma atividade recente.</p></div>';
            return;
        }

        container.innerHTML = this.activities.slice(0, 10).map(activity => `
            <div class="activity-item">
                <div class="activity-time">${activity.timestamp}</div>
                <div class="activity-message">${activity.message}</div>
            </div>
        `).join('');
    }

    // Sistema de backup (nova funcionalidade)
    createBackup() {
        this.showLoading('Criando backup...');
        
        const backup = {
            id: Date.now(),
            date: new Date().toISOString(),
            accounts: JSON.parse(JSON.stringify(this.accounts)),
            activities: JSON.parse(JSON.stringify(this.activities.slice(0, 20))),
            version: '3.1',
            accountCount: this.accounts.length
        };

        setTimeout(() => {
            this.backups.unshift(backup);
            this.backups.splice(10); // Manter apenas 10 backups
            
            // Salvar backup
            const backupContent = JSON.stringify(backup, null, 2);
            const filename = `backup-${new Date().toISOString().split('T')[0]}-${backup.id}`;
            this.downloadBlob(backupContent, `${filename}.json`, 'application/json');
            
            this.hideLoading();
            this.showAlert('Backup criado com sucesso!', 'success');
            this.logActivity(`Backup criado: ${backup.accountCount} contas`);
            this.updateBackupStats();
        }, 1000);
    }

    updateBackupStats() {
        this.updateElement('backup-count', this.backups.length);
        this.updateElement('last-backup-date', 
            this.backups.length > 0 
                ? new Date(this.backups[0].date).toLocaleDateString()
                : 'Nunca'
        );
    }

    scheduleBackup() {
        this.showAlert('Funcionalidade de agendamento será implementada em versão futura', 'info');
    }

    restoreBackup() {
        this.showAlert('Carregue um arquivo de backup usando a opção "Carregar Arquivo"', 'info');
    }

    exportEncrypted() {
        const password = prompt('Digite uma senha para criptografar o arquivo:');
        if (!password) return;
        
        this.showAlert('Funcionalidade de criptografia será implementada em versão futura', 'info');
    }

    // Limpeza do formulário
clearForm() {
    const form = document.getElementById('account-form');
    if (form) form.reset();
    
    // Remover campo de edição se existir
    const editField = document.getElementById('edit-account-id');
    if (editField) {
        editField.remove();
    }
    
    // Restaurar texto do botão
    const submitBtn = document.querySelector('#account-form button[type="submit"]');
    if (submitBtn) submitBtn.innerHTML = '➕ Adicionar Conta';
    
    // Limpar validações
    document.querySelectorAll('.form-group').forEach(group => {
        group.classList.remove('invalid');
    });
    document.querySelectorAll('.error-message').forEach(error => {
        error.textContent = '';
    });
    
    // Limpar medidor de força da senha
    const passwordStrength = document.getElementById('password-strength');
    const passwordStrengthFill = document.getElementById('password-strength-fill');
    
    if (passwordStrength) {
        passwordStrength.textContent = 'Use pelo menos 8 caracteres com letras, números e símbolos';
    }
    if (passwordStrengthFill) {
        passwordStrengthFill.className = 'strength-fill';
    }
}

    // Sistema de alertas melhorado
    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; font-size: 1.2em; cursor: pointer; color: inherit;">×</button>
        `;
        alertDiv.setAttribute('role', 'alert');
        
        const container = document.querySelector('.main-content') || document.body;
        container.insertBefore(alertDiv, container.firstChild);
        
        // Auto-remove após 7 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 7000);
        
        // Scroll para mostrar o alerta
        alertDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Destructor para limpeza
    destroy() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }
    }
}

// Função de alternância de abas aprimorada
function switchTab(tabName) {
    // Ocultar todos os conteúdos das abas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remover active e aria-selected de todas as abas
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
    });
    
    // Mostrar conteúdo da aba selecionada
    const targetTab = document.getElementById(tabName);
    if (targetTab) targetTab.classList.add('active');
    
    // Ativar aba clicada
    if (event && event.target) {
        event.target.classList.add('active');
        event.target.setAttribute('aria-selected', 'true');
    }
    
    // Atualizar URL sem recarregar página
    if (history.pushState) {
        history.pushState(null, null, `#${tabName}`);
    }
}

// Inicialização da aplicação
let accountManager;

document.addEventListener('DOMContentLoaded', () => {
    accountManager = new AccountManager();
    
    // Verificar hash na URL para aba inicial
    const hash = window.location.hash.substring(1);
    if (hash && document.getElementById(hash)) {
        const tabButton = document.querySelector(`[onclick*="${hash}"]`);
        if (tabButton) {
            tabButton.click();
        }
    }
});

// Funções globais para compatibilidade
function createNewFile() { if (accountManager) accountManager.createNewFile(); }
function loadFile() { if (accountManager) accountManager.loadFile(); }
function saveFile() { if (accountManager) accountManager.saveFile(); }
function saveAsFile() { if (accountManager) accountManager.saveAsFile(); }
function exportData() { if (accountManager) accountManager.exportData(); }
function loginAllAccounts() { if (accountManager) accountManager.loginAllAccounts(); }
function logoutAllAccounts() { if (accountManager) accountManager.logoutAllAccounts(); }
function checkAccountStatus() { if (accountManager) accountManager.checkAccountStatus(); }
function confirmAction(action, message, data) { if (accountManager) accountManager.confirmAction(action, message, data); }
function togglePassword(fieldId) { if (accountManager) accountManager.togglePassword(fieldId); }
function generateSecurityReport() { if (accountManager) accountManager.generateSecurityReport(); }
function createBackup() { if (accountManager) accountManager.createBackup(); }
function scheduleBackup() { if (accountManager) accountManager.scheduleBackup(); }
function restoreBackup() { if (accountManager) accountManager.restoreBackup(); }
function exportEncrypted() { if (accountManager) accountManager.exportEncrypted(); }

// Cleanup ao fechar página
window.addEventListener('beforeunload', () => {
    if (accountManager) {
        accountManager.destroy();
    }
});