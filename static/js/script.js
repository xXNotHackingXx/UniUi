document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const systemInfoContainer = document.getElementById('system-info');
    const chatHistoryContainer = document.getElementById('chat-history');
    const currentTimeElement = document.getElementById('current-time');
    const welcomeTimestamp = document.getElementById('welcome-timestamp');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        
        if (sidebar.classList.contains('collapsed')) {
            sidebarToggle.setAttribute('title', 'Show sidebar');
        } else {
            sidebarToggle.setAttribute('title', 'Hide sidebar');
        }
        
        localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
    });
    
    const sidebarCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
        sidebarToggle.setAttribute('title', 'Show sidebar');
    } else {
        sidebarToggle.setAttribute('title', 'Hide sidebar');
    }
    
    const systemInfoHeader = document.getElementById('system-info-header');
    const systemInfoContent = document.getElementById('system-info-content');
    const historyHeader = document.getElementById('history-header');
    const historyContent = document.getElementById('history-content');
    
    const messageHistory = {
        user: [],
        system: []
    };
    
    const STORAGE_KEY = 'uniui_message_history';
    
    const MAX_HISTORY_ITEMS = 20;
    
    const MAX_DISPLAY_ITEMS = 10;
    
    initCollapsibleSections();
    
    loadHistoryFromStorage();
    
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.scrollHeight > 150) {
            this.style.height = '150px';
        }
    });
    
    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const event = new Event('submit');
            chatForm.dispatchEvent(event);
        }
    });
    
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000);
    
    fetchSystemInfo();
    
    chatForm.addEventListener('submit', handleChatSubmit);
    
    window.setQuery = function(queryText) {
        chatInput.value = queryText;
        chatInput.focus();
        
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
    };
    
    function saveHistoryToStorage() {
        try {
            const historyToSave = {
                user: messageHistory.user.map(msg => ({
                    ...msg,
                    timestamp: msg.timestamp.toISOString()
                })),
                system: messageHistory.system.map(msg => ({
                    ...msg,
                    timestamp: msg.timestamp.toISOString()
                }))
            };
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(historyToSave));
        } catch (error) {
            console.error('Error saving history to local storage:', error);
        }
    }
    
    function loadHistoryFromStorage() {
        try {
            const savedHistory = localStorage.getItem(STORAGE_KEY);
            
            if (savedHistory) {
                const parsedHistory = JSON.parse(savedHistory);
                
                messageHistory.user = parsedHistory.user.map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }));
                
                messageHistory.system = parsedHistory.system.map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }));
                
                updateHistoryUI();
            }
        } catch (error) {
            console.error('Error loading history from local storage:', error);
            messageHistory.user = [];
            messageHistory.system = [];
        }
    }
    
    function initCollapsibleSections() {
        setupCollapsibleSection(systemInfoHeader, systemInfoContent);
        
        setupCollapsibleSection(historyHeader, historyContent);
        
        systemInfoContent.classList.add('collapsed');
        systemInfoHeader.querySelector('.toggle-icon').classList.add('collapsed');
        
        adjustSectionHeights();
        
        window.addEventListener('resize', adjustSectionHeights);
    }
    
    function setupCollapsibleSection(header, content) {
        const toggleIcon = header.querySelector('.toggle-icon');
        
        header.addEventListener('click', () => {
            content.classList.toggle('collapsed');
            
            toggleIcon.classList.toggle('collapsed');
            
            setTimeout(adjustSectionHeights, 10);
        });
        
        content.classList.remove('collapsed');
        toggleIcon.classList.remove('collapsed');
    }
    
    function adjustSectionHeights() {
        const sections = document.querySelectorAll('.collapsible-section');
        const expandedSections = Array.from(sections).filter(section => 
            !section.querySelector('.section-content').classList.contains('collapsed')
        );
        
        sections.forEach(section => {
            const content = section.querySelector('.section-content');
            if (content.classList.contains('collapsed')) {
                content.style.maxHeight = '0';
                content.style.height = '0';
            }
        });
        
        if (expandedSections.length === 0) return;
        
        const sidebarSections = document.querySelector('.sidebar-sections');
        const availableHeight = sidebarSections.clientHeight;
        
        const headerHeight = 46;
        const totalHeaders = sections.length * headerHeight;
        const availableForContent = availableHeight - totalHeaders;
        
        const historyMinHeight = 200;
        const systemInfoMinHeight = 150;
        
        let totalMinHeight = 0;
        expandedSections.forEach(section => {
            if (section.querySelector('#history-content')) {
                totalMinHeight += historyMinHeight;
            } else if (section.querySelector('#system-info-content')) {
                totalMinHeight += systemInfoMinHeight;
            }
        });
        
        if (availableForContent < totalMinHeight && expandedSections.length > 1) {
            expandedSections.forEach(section => {
                const content = section.querySelector('.section-content');
                if (content.id === 'history-content') {
                    content.style.maxHeight = `${historyMinHeight}px`;
                    content.style.height = `${historyMinHeight}px`;
                } else if (content.id === 'system-info-content') {
                    content.style.maxHeight = `${systemInfoMinHeight}px`;
                    content.style.height = `${systemInfoMinHeight}px`;
                }
            });
        } else {
            let remainingSpace = availableForContent;
            let remainingSections = expandedSections.length;
            
            expandedSections.forEach(section => {
                const content = section.querySelector('.section-content');
                let minHeight = 0;
                
                if (content.id === 'history-content') {
                    minHeight = historyMinHeight;
                } else if (content.id === 'system-info-content') {
                    minHeight = systemInfoMinHeight;
                }
                
                const heightPerSection = Math.max(minHeight, remainingSpace / remainingSections);
                content.style.maxHeight = `${heightPerSection}px`;
                content.style.height = `${heightPerSection}px`;
                
                remainingSpace -= heightPerSection;
                remainingSections--;
            });
        }
    }
    
    function updateCurrentTime() {
        const now = new Date();
        currentTimeElement.textContent = formatDateTime(now);
        
        if (welcomeTimestamp && !welcomeTimestamp.textContent) {
            welcomeTimestamp.textContent = formatTime(now);
        }
    }
    
    function formatDateTime(date) {
        return new Intl.DateTimeFormat('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        }).format(date);
    }
    
    function formatTime(date) {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        }).format(date);
    }
        
    async function fetchSystemInfo() {
        try {
            const response = await fetch('/system_info');
            const data = await response.json();
            
            systemInfoContainer.innerHTML = '';
            
            if (data.ip_address) {
                const ipContainer = document.createElement('div');
                ipContainer.className = 'ip-address-container';
                
                const ipLabel = document.createElement('div');
                ipLabel.className = 'ip-address-label';
                ipLabel.textContent = 'Network:';
                
                const ipValue = document.createElement('div');
                ipValue.className = 'ip-address-value';
                ipValue.textContent = `http://${data.ip_address}`;
                
                ipContainer.appendChild(ipLabel);
                ipContainer.appendChild(ipValue);
                systemInfoContainer.appendChild(ipContainer);
                
                const separator = document.createElement('hr');
                separator.className = 'info-separator';
                systemInfoContainer.appendChild(separator);
            }
            
            for (const [key, value] of Object.entries(data)) {
                if (key === 'ip_address') continue;
                
                const infoItem = document.createElement('div');
                infoItem.className = 'info-item';
                
                const label = document.createElement('span');
                label.className = 'info-label';
                label.textContent = formatLabel(key);
                
                const infoValue = document.createElement('span');
                infoValue.className = 'info-value';
                infoValue.textContent = value;
                
                infoItem.appendChild(label);
                infoItem.appendChild(infoValue);
                systemInfoContainer.appendChild(infoItem);
            }
        } catch (error) {
            systemInfoContainer.innerHTML = `<div class="info-item">Error fetching system info: ${error.message}</div>`;
        }
    }
    
    function formatLabel(key) {
        return key
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ') + ':';
    }
    
    async function handleChatSubmit(e) {
        e.preventDefault();
        
        const userInput = chatInput.value.trim();
        if (!userInput) return;
        
        addMessage('user', userInput);
        
        chatInput.value = '';
        chatInput.style.height = 'auto';
        
        const thinkingId = showThinkingMessage();
        
        try {
            const response = await fetch('/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: userInput,
                    history: {
                        user_messages: messageHistory.user,
                        system_responses: messageHistory.system
                    }
                })
            });
            
            const data = await response.json();
            
            removeThinkingMessage(thinkingId);
            
            if (data.error) {
                const errorMessage = `Error: ${data.error}`;
                const formattedError = createCodeBlock(errorMessage, 'Error');
                addMessage('system', formattedError, true);
                addToHistory('system', errorMessage);
            } else {
                let responseContent = '';
                
                responseContent += createCodeBlock(data.command, 'Command');
                

                if (data.result.error) {
                    responseContent += `<p></p>`;
                    responseContent += createCodeBlock(data.result.error, 'Error');
                } else {
                    responseContent += `<p></p>`;
                    responseContent += createCodeBlock(data.result.output || 'No output', 'Output');
                }
                
                const messageObj = addMessage('system', responseContent, true);
                const messageEl = messageObj.element;
                
                if (data.retry_count && data.retry_count > 0) {
                    const retryText = data.result.error ? 
                        `The initial command had issues and was automatically fixed, but still encountered errors after ${data.retry_count} ${data.retry_count === 1 ? 'attempt' : 'attempts'}.` :
                        `The initial command had issues and was automatically fixed after ${data.retry_count} ${data.retry_count === 1 ? 'attempt' : 'attempts'}.`;
                    
                    const timestamp = messageEl.querySelector('.message-timestamp');
                    const warningIcon = document.createElement('i');
                    warningIcon.className = 'fas fa-exclamation-triangle warning-icon';
                    warningIcon.title = 'Command was fixed automatically';
                    
                    warningIcon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        
                        const tooltip = document.createElement('div');
                        tooltip.className = 'retry-tooltip';
                        tooltip.style.width = '400px';
                        tooltip.style.minWidth = '400px';
                        tooltip.style.maxWidth = 'none';
                        
                        const tooltipContent = document.createElement('div');
                        tooltipContent.innerHTML = `<div>${retryText}</div>`;
                        tooltip.appendChild(tooltipContent);
                        
                        timestamp.appendChild(tooltip);
                        
                        const removeTooltip = () => {
                            tooltip.remove();
                            document.removeEventListener('click', removeTooltip);
                        };
                        
                        setTimeout(removeTooltip, 5000);
                        document.addEventListener('click', removeTooltip);
                    });
                    
                    const terminalIcon = document.createElement('i');
                    terminalIcon.className = 'fas fa-terminal terminal-icon';
                    terminalIcon.title = 'View terminal history';
                    
                    terminalIcon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        showTerminalHistory(thinkingId, timestamp);
                    });
                    
                    const explainIcon = document.createElement('i');
                    explainIcon.className = 'fas fa-magic explain-icon';
                    explainIcon.title = 'Explain this output';
                    
                    explainIcon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        
                        const originalClass = explainIcon.className;
                        explainIcon.className = 'fas fa-sync-alt fa-spin explain-icon';
                        
                        const commandToExplain = data.command;
                        const outputToExplain = data.result.error || data.result.output || 'No output';
                        
                        explainOutput(commandToExplain, outputToExplain).then(explanation => {
                            const parsedExplanation = parseMarkdown(explanation);
                            
                            const explanationContent = `<p></p><div class="markdown-content">${parsedExplanation}</div>`;
                            addMessage('system', explanationContent, true);
                            
                            explainIcon.className = originalClass;
                        }).catch(err => {
                            console.error('Error getting explanation:', err);
                            
                            explainIcon.className = originalClass;
                            
                            const errorContent = `<p>Error getting explanation: ${err.message}</p>`;
                            addMessage('system', errorContent, true);
                        });
                    });
                    
                    timestamp.insertBefore(warningIcon, timestamp.firstChild);
                    timestamp.insertBefore(terminalIcon, timestamp.firstChild.nextSibling);
                    timestamp.insertBefore(explainIcon, timestamp.firstChild.nextSibling.nextSibling);
                } else {
                    const timestamp = messageEl.querySelector('.message-timestamp');
                    
                    const terminalIcon = document.createElement('i');
                    terminalIcon.className = 'fas fa-terminal terminal-icon';
                    terminalIcon.title = 'View terminal history';
                    
                    terminalIcon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        showTerminalHistory(thinkingId, timestamp);
                    });
                    
                    const explainIcon = document.createElement('i');
                    explainIcon.className = 'fas fa-magic explain-icon';
                    explainIcon.title = 'Explain this output';
                    
                    explainIcon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        
                        const originalClass = explainIcon.className;
                        explainIcon.className = 'fas fa-sync-alt fa-spin explain-icon';
                        
                        const commandToExplain = data.command;
                        const outputToExplain = data.result.error || data.result.output || 'No output';
                        
                        explainOutput(commandToExplain, outputToExplain).then(explanation => {
                            const parsedExplanation = parseMarkdown(explanation);
                            
                            const explanationContent = `<p></p><div class="markdown-content">${parsedExplanation}</div>`;
                            addMessage('system', explanationContent, true);
                            
                            explainIcon.className = originalClass;
                        }).catch(err => {
                            console.error('Error getting explanation:', err);
                            
                            explainIcon.className = originalClass;
                            
                            const errorContent = `<p>Error getting explanation: ${err.message}</p>`;
                            addMessage('system', errorContent, true);
                        });
                    });
                    
                    timestamp.insertBefore(terminalIcon, timestamp.firstChild);
                    timestamp.insertBefore(explainIcon, timestamp.firstChild.nextSibling);
                }
                
                const fullCommandDetails = {
                    userQuery: userInput,
                    command: data.command,
                    output: data.result.error || data.result.output || 'No output',
                    retryCount: data.retry_count || 0
                };
                
                let historySummary = userInput.length > 60 
                    ? userInput.substring(0, 57) + '...' 
                    : userInput;
                
                addToHistory('system', historySummary, fullCommandDetails);
                
                if (historyContent.classList.contains('collapsed')) {
                    historyHeader.click();
                }
            }
        } catch (error) {
            removeThinkingMessage(thinkingId);
            
            const errorMessage = `Sorry, there was an error processing your request: ${error.message}`;
            const formattedError = createCodeBlock(errorMessage, 'Error');
            addMessage('system', formattedError, true);
            addToHistory('system', errorMessage);
        }
    }
    
    function createCodeBlock(content, label = 'Output') {
        const id = 'code-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        
        const lines = content.split('\n');
        
        if (lines.length > 1) {
            const formattedContent = escapeHtml(content);
            
            return `
                <div class="code-block-container">
                    <div class="code-block-header">
                        <span data-label="${label}">${label}</span>
                        <div class="code-block-actions">
                            <span class="line-count">${lines.length} lines</span>
                            <button class="copy-button" data-code-id="${id}" title="Copy to clipboard">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    <div class="code-block-with-lines" style="max-height: none; overflow-y: visible;">
                        <div class="line-numbers" style="max-height: none; overflow-y: visible;">
                            ${Array.from({ length: lines.length }, (_, i) => 
                                `<span class="line-number">${i + 1}</span>`
                            ).join('')}
                        </div>
                        <pre id="${id}" class="code-block" style="max-height: none; overflow-y: visible;">${formattedContent}</pre>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="code-block-container">
                    <div class="code-block-header">
                        <span data-label="${label}">${label}</span>
                        <button class="copy-button" data-code-id="${id}" title="Copy to clipboard">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <pre id="${id}" class="code-block" style="max-height: none; overflow-y: visible;">${escapeHtml(content)}</pre>
                </div>
            `;
        }
    }
    
    function addMessage(type, content, isHtml = false) {
        const timestamp = new Date();
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        
        if (type === 'user') {
            const icon = document.createElement('i');
            icon.className = 'fas fa-user';
            avatarDiv.appendChild(icon);
        } else {
            const logoSpan = document.createElement('span');
            logoSpan.className = 'ui-logo';
            logoSpan.textContent = 'ui';
            avatarDiv.appendChild(logoSpan);
        }
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (isHtml) {
            contentDiv.innerHTML = content;
            
            setTimeout(() => {
                const copyButtons = contentDiv.querySelectorAll('.copy-button');
                copyButtons.forEach(button => {
                    button.addEventListener('click', handleCopyButtonClick);
                });
            }, 0);
        } else {
            contentDiv.textContent = content;
        }
        
        const timestampDiv = document.createElement('div');
        timestampDiv.className = 'message-timestamp';
        
        const clockIcon = document.createElement('i');
        clockIcon.className = 'fas fa-clock';
        timestampDiv.appendChild(clockIcon);
        
        const timeText = document.createTextNode(' ' + formatTime(timestamp));
        timestampDiv.appendChild(timeText);
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        if (type === 'user') {
            const footerDiv = document.createElement('div');
            footerDiv.className = 'message-footer';
            
            const actionDiv = document.createElement('div');
            actionDiv.className = 'message-actions';
            
            const editBtn = document.createElement('button');
            editBtn.className = 'message-action-btn edit-btn';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.title = 'Edit this message';
            editBtn.addEventListener('click', () => {
                chatInput.value = content;
                chatInput.focus();
                
                chatInput.style.height = 'auto';
                chatInput.style.height = (chatInput.scrollHeight) + 'px';
                
                chatInput.scrollIntoView({ behavior: 'smooth' });
            });
            
            const retryBtn = document.createElement('button');
            retryBtn.className = 'message-action-btn retry-btn';
            retryBtn.innerHTML = '<i class="fas fa-redo-alt"></i>';
            retryBtn.title = 'Retry this message';
            retryBtn.addEventListener('click', () => {
                chatInput.value = content;
                chatForm.dispatchEvent(new Event('submit'));
            });
            
            actionDiv.appendChild(editBtn);
            actionDiv.appendChild(retryBtn);
            
            footerDiv.appendChild(actionDiv);
            footerDiv.appendChild(timestampDiv);
            
            messageDiv.appendChild(footerDiv);
        } else {
            messageDiv.appendChild(timestampDiv);
        }
        
        chatMessages.appendChild(messageDiv);
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return {
            type,
            content: isHtml ? 'HTML content' : content,
            timestamp,
            element: messageDiv
        };
    }
    
    function handleCopyButtonClick(e) {
        const button = e.currentTarget;
        const codeId = button.getAttribute('data-code-id');
        const codeElement = document.getElementById(codeId);
        
        if (codeElement) {
            const text = codeElement.textContent;
            
            navigator.clipboard.writeText(text).then(() => {
                const originalHTML = button.innerHTML;
                button.innerHTML = '<i class="fas fa-check"></i>';
                button.classList.add('copied');
                
                setTimeout(() => {
                    button.innerHTML = originalHTML;
                    button.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy: ', err);
            });
        }
    }
    
    function addToHistory(type, content, details = null) {
        const timestamp = new Date();
        
        messageHistory[type].push({
            content,
            timestamp,
            details
        });
        
        if (messageHistory[type].length > MAX_HISTORY_ITEMS) {
            messageHistory[type].shift();
        }
        
        updateHistoryUI();
        
        saveHistoryToStorage();
    }
    
    function updateHistoryUI() {
        chatHistoryContainer.innerHTML = '';
        
        if (messageHistory.user.length === 0 && messageHistory.system.length === 0) {
            chatHistoryContainer.innerHTML = '<div class="history-empty">No messages yet</div>';
            return;
        }
        
        const combinedHistory = [
            ...messageHistory.user.map(msg => ({ ...msg, type: 'user' })),
            ...messageHistory.system.map(msg => ({ ...msg, type: 'system' }))
        ].sort((a, b) => b.timestamp - a.timestamp);
        
        const totalItems = combinedHistory.length;
        
        const displayItems = combinedHistory.slice(0, MAX_DISPLAY_ITEMS);
        
        displayItems.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = `history-item history-${item.type}`;
            
            const messageSpan = document.createElement('div');
            messageSpan.className = 'history-message';
            messageSpan.textContent = item.content;
            
            const timestampSpan = document.createElement('div');
            timestampSpan.className = 'history-timestamp';
            timestampSpan.textContent = formatTime(item.timestamp);
            
            historyItem.appendChild(messageSpan);
            historyItem.appendChild(timestampSpan);
            
            historyItem.addEventListener('click', () => {
                showHistoryPopup(item);
                
                if (item.type === 'user') {
                    chatInput.value = item.content;
                    chatInput.focus();
                }
            });
            
            chatHistoryContainer.appendChild(historyItem);
        });
        
        if (totalItems > MAX_DISPLAY_ITEMS) {
            const moreItemsDiv = document.createElement('div');
            moreItemsDiv.className = 'history-more-items';
            moreItemsDiv.textContent = `+ ${totalItems - MAX_DISPLAY_ITEMS} more items stored locally`;
            chatHistoryContainer.appendChild(moreItemsDiv);
        }
    }
    
    function showHistoryPopup(item) {
        removeHistoryPopup();
        
        const popup = document.createElement('div');
        popup.id = 'history-popup';
        popup.className = `history-popup history-popup-${item.type}`;
        
        const header = document.createElement('div');
        header.className = 'popup-header';
        
        const title = document.createElement('div');
        title.className = 'popup-title';
        title.textContent = item.type === 'user' ? 'Your Message' : 'System Response';
        
        const timestamp = document.createElement('div');
        timestamp.className = 'popup-timestamp';
        timestamp.textContent = formatDateTime(item.timestamp);
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'popup-close';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeHistoryPopup();
        });
        
        header.appendChild(title);
        header.appendChild(timestamp);
        header.appendChild(closeBtn);
        
        const content = document.createElement('div');
        content.className = 'popup-content';
        
        if (item.type === 'user') {
            content.textContent = item.content;
        } else if (item.details) {
            
            if (item.details.userQuery) {
                const querySection = document.createElement('div');
                querySection.className = 'popup-section';
                
                const queryTitle = document.createElement('h3');
                queryTitle.className = 'popup-section-title';
                queryTitle.textContent = 'Your Request:';
                querySection.appendChild(queryTitle);
                
                const queryText = document.createElement('div');
                queryText.className = 'popup-query';
                queryText.textContent = item.details.userQuery;
                querySection.appendChild(queryText);
                
                content.appendChild(querySection);
            }
            
            const commandSection = document.createElement('div');
            commandSection.className = 'popup-section';
            
            const commandTitle = document.createElement('h3');
            commandTitle.className = 'popup-section-title';
            commandTitle.textContent = 'Command:';
            commandSection.appendChild(commandTitle);
            
            const commandCode = document.createElement('pre');
            commandCode.className = 'popup-code';
            commandCode.textContent = item.details.command;
            commandSection.appendChild(commandCode);
            
            const outputSection = document.createElement('div');
            outputSection.className = 'popup-section';
            
            const outputTitle = document.createElement('h3');
            outputTitle.className = 'popup-section-title';
            outputTitle.textContent = 'Output:';
            outputSection.appendChild(outputTitle);
            
            const outputCode = document.createElement('pre');
            outputCode.className = 'popup-code';
            outputCode.textContent = item.details.output || 'No output';
            outputSection.appendChild(outputCode);
            
            content.appendChild(commandSection);
            content.appendChild(outputSection);
        } else {
            content.textContent = item.content;
        }
        
        const footer = document.createElement('div');
        footer.className = 'popup-footer';
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'popup-action';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            let textToCopy = item.content;
            
            if (item.type === 'system' && item.details) {
                if (item.details.userQuery) {
                    textToCopy = `Query: ${item.details.userQuery}\n\nCommand: ${item.details.command}\n\nOutput: ${item.details.output || 'No output'}`;
                } else {
                    textToCopy = `Command: ${item.details.command}\n\nOutput: ${item.details.output || 'No output'}`;
                }
            }
            
            navigator.clipboard.writeText(textToCopy)
                .then(() => {
                    copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                    }, 2000);
                })
                .catch(err => {
                    console.error('Failed to copy:', err);
                    copyBtn.innerHTML = '<i class="fas fa-times"></i> Failed';
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                    }, 2000);
                });
        });
        
        footer.appendChild(copyBtn);
        
        if (item.type === 'user') {
            const sendBtn = document.createElement('button');
            sendBtn.className = 'popup-action popup-action-primary';
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Again';
            sendBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                chatInput.value = item.content;
                chatForm.dispatchEvent(new Event('submit'));
                removeHistoryPopup();
            });
            footer.appendChild(sendBtn);
        }
        
        if (item.type === 'system' && item.details && item.details.command) {
            const cmdBtn = document.createElement('button');
            cmdBtn.className = 'popup-action popup-action-secondary';
            cmdBtn.innerHTML = '<i class="fas fa-terminal"></i> Copy Command';
            cmdBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(item.details.command)
                    .then(() => {
                        cmdBtn.innerHTML = '<i class="fas fa-check"></i> Command Copied!';
                        setTimeout(() => {
                            cmdBtn.innerHTML = '<i class="fas fa-terminal"></i> Copy Command';
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('Failed to copy command:', err);
                        cmdBtn.innerHTML = '<i class="fas fa-times"></i> Failed';
                        setTimeout(() => {
                            cmdBtn.innerHTML = '<i class="fas fa-terminal"></i> Copy Command';
                        }, 2000);
                    });
            });
            footer.appendChild(cmdBtn);
        }

        const storageInfo = document.createElement('div');
        storageInfo.className = 'popup-storage-info';
        footer.appendChild(storageInfo);
        
        popup.appendChild(header);
        popup.appendChild(content);
        popup.appendChild(footer);
        
        document.body.appendChild(popup);
        
        const backdrop = document.createElement('div');
        backdrop.id = 'popup-backdrop';
        backdrop.addEventListener('click', removeHistoryPopup);
        document.body.appendChild(backdrop);
        
        const escKeyHandler = (e) => {
            if (e.key === 'Escape') {
                removeHistoryPopup();
                document.removeEventListener('keydown', escKeyHandler);
            }
        };
        document.addEventListener('keydown', escKeyHandler);
        
        setTimeout(() => {
            popup.classList.add('active');
            backdrop.classList.add('active');
        }, 10);
    }
    
    function removeHistoryPopup() {
        const popup = document.getElementById('history-popup');
        const backdrop = document.getElementById('popup-backdrop');
        
        if (popup) {
            popup.classList.remove('active');
            setTimeout(() => {
                popup.remove();
            }, 300);
        }
        
        if (backdrop) {
            backdrop.classList.remove('active');
            setTimeout(() => {
                backdrop.remove();
            }, 300);
        }
    }
    
    if (!window.terminalHistory) {
        window.terminalHistory = {};
    }

    function showThinkingMessage() {
        const thinkingId = 'thinking-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message thinking';
        messageDiv.id = thinkingId;
        
        window.terminalHistory[thinkingId] = [];
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        
        const logoSpan = document.createElement('span');
        logoSpan.className = 'ui-logo thinking';
        logoSpan.textContent = 'ui';
        avatarDiv.appendChild(logoSpan);
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const typingAnimation = document.createElement('div');
        typingAnimation.className = 'typing-animation';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'typing-dot';
            typingAnimation.appendChild(dot);
        }
        
        contentDiv.appendChild(typingAnimation);
        
        const terminalStatus = document.createElement('div');
        terminalStatus.className = 'terminal-status';
        terminalStatus.id = thinkingId + '-status';
        
        const statusTag = document.createElement('span');
        statusTag.className = 'terminal-status-tag';
        statusTag.textContent = '[Initializing]';
        
        const statusDescription = document.createTextNode(' Preparing terminal environment...');
        
        terminalStatus.appendChild(statusTag);
        terminalStatus.appendChild(statusDescription);
        
        contentDiv.appendChild(terminalStatus);
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        chatMessages.appendChild(messageDiv);
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        const terminalStream = new EventSource('/terminal_stream');
        
        messageDiv.dataset.terminalStream = true;
        
        const outputContainer = document.createElement('div');
        outputContainer.className = 'terminal-output-container';
        outputContainer.style.fontFamily = 'var(--code-font)';
        outputContainer.style.marginTop = '10px';
        outputContainer.style.maxHeight = '200px';
        outputContainer.style.overflowY = 'auto';
        outputContainer.style.padding = '8px';
        outputContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        outputContainer.style.borderRadius = '4px';
        outputContainer.style.fontSize = '0.8rem';
        
        terminalStatus.appendChild(outputContainer);
        
        terminalStream.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                
                if (data.status === 'heartbeat') {
                    return;
                }
                
                window.terminalHistory[thinkingId].push(data);
                
                const statusElement = document.getElementById(thinkingId + '-status');
                if (!statusElement) {
                    terminalStream.close();
                    return;
                }
                
                const outputLine = document.createElement('div');
                
                const statusTag = statusElement.querySelector('.terminal-status-tag');
                
                const statusText = statusElement.childNodes[1];
                
                switch (data.status) {
                    case 'analyzing':
                        statusTag.textContent = '[Analyzing]';
                        statusText.nodeValue = ' Generating command...';
                        outputLine.innerHTML = `<span style="color: var(--info-color);">⚙️ ${data.details}</span>`;
                        break;
                    case 'command_generated':
                        statusTag.textContent = '[Command Ready]';
                        statusText.nodeValue = ' Command generated successfully';
                        outputLine.innerHTML = `<span style="color: var(--primary-light);">📋 ${data.details}</span>`;
                        break;
                    case 'executing':
                        statusTag.textContent = '[Executing]';
                        statusText.nodeValue = ' Executing the command...';
                        outputLine.innerHTML = `<span style="color: var(--warning-color);">🔄 ${data.details}</span>`;
                        break;
                    case 'output':
                        if (data.error) {
                            outputLine.innerHTML = `<span style="color: var(--error-color);">${data.details}</span>`;
                        } else {
                            outputLine.innerHTML = `<span style="color: var(--success-color);">${data.details}</span>`;
                        }
                        break;
                    case 'fixing':
                        statusTag.textContent = '[Fixing]';
                        statusText.nodeValue = ' Attempting to fix command...';
                        outputLine.innerHTML = `<span style="color: var(--warning-color);">🔧 ${data.details}</span>`;
                        break;
                    case 'fixed':
                        statusTag.textContent = '[Fixed]';
                        statusText.nodeValue = ' Command fixed successfully';
                        outputLine.innerHTML = `<span style="color: var(--success-color);">✅ ${data.details}</span>`;
                        break;
                    case 'finished':
                    case 'completed':
                        statusTag.textContent = '[Completed]';
                        statusText.nodeValue = ' Command execution complete';
                        outputLine.innerHTML = `<span style="color: var(--success-color);">✓ ${data.details}</span>`;
                        break;
                    case 'failed':
                        statusTag.textContent = '[Failed]';
                        statusText.nodeValue = ' Command execution failed';
                        outputLine.innerHTML = `<span style="color: var(--error-color);">❌ ${data.details}</span>`;
                        break;
                    case 'error':
                        statusTag.textContent = '[Error]';
                        statusText.nodeValue = ' An error occurred';
                        outputLine.innerHTML = `<span style="color: var(--error-color);">❌ ${data.details}</span>`;
                        break;
                    default:
                        outputLine.textContent = JSON.stringify(data);
                }
                
                outputContainer.appendChild(outputLine);
                
                outputContainer.scrollTop = outputContainer.scrollHeight;
            } catch (error) {
                console.error('Error processing terminal output:', error);
            }
        };
        
        terminalStream.onerror = function(error) {
            console.error('Terminal stream error:', error);
            terminalStream.close();
        };
        
        if (!window.activeTerminalStreams) {
            window.activeTerminalStreams = {};
        }
        window.activeTerminalStreams[thinkingId] = terminalStream;
        
        return thinkingId;
    }
    
    function removeThinkingMessage(id) {
        const thinkingMessage = document.getElementById(id);
        if (thinkingMessage) {
            if (window.activeTerminalStreams && window.activeTerminalStreams[id]) {
                window.activeTerminalStreams[id].close();
                delete window.activeTerminalStreams[id];
            }
            
            thinkingMessage.remove();
        }
    }
    
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    async function explainOutput(command, output) {
        try {
            const response = await fetch('/explain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    command: command,
                    output: output
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            return data.explanation;
        } catch (error) {
            console.error('Error getting explanation:', error);
            throw error;
        }
    }

    function parseMarkdown(markdown) {
        if (!markdown) return '';
        
        let html = markdown.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
        
        html = html.replace(/^\s*[-*+]\s+(.*)/gm, '<li>$1</li>');
        html = html.replace(/<li>(.*?)<\/li>/g, '<ul><li>$1</li></ul>');
        html = html.replace(/<\/ul>\s*<ul>/g, '');
        
        html = html.replace(/^##### (.*?)$/gm, '<h5>$1</h5>');
        html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
        html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
        
        html = html.split(/\n\n+/).map(para => `<p>${para}</p>`).join('');
        
        html = html.replace(/<li><p>(.*?)<\/p><\/li>/g, '<li>$1</li>');
        
        return html;
    }

    function showTerminalHistory(thinkingId, parentElement) {
        if (!window.terminalHistory || !window.terminalHistory[thinkingId] || window.terminalHistory[thinkingId].length === 0) {
            console.warn('No terminal history found for', thinkingId);
            return;
        }
        
        const existingTooltip = document.querySelector('.terminal-history-tooltip');
        const existingOverlay = document.querySelector('.terminal-history-overlay');
        if (existingTooltip) existingTooltip.remove();
        if (existingOverlay) existingOverlay.remove();
        
        const overlay = document.createElement('div');
        overlay.className = 'terminal-history-overlay';
        document.body.appendChild(overlay);
        
        const tooltip = document.createElement('div');
        tooltip.className = 'terminal-history-tooltip';
        document.body.appendChild(tooltip);
        
        const title = document.createElement('div');
        title.className = 'terminal-history-tooltip-title';
        title.textContent = 'Terminal Output History';
        tooltip.appendChild(title);
        
        const closeButton = document.createElement('button');
        closeButton.className = 'terminal-history-close';
        closeButton.innerHTML = '<i class="fas fa-times"></i>';
        closeButton.title = 'Close';
        tooltip.appendChild(closeButton);
        
        const xCloseButton = document.createElement('button');
        xCloseButton.className = 'terminal-history-x-close';
        xCloseButton.innerHTML = '<i class="fas fa-times"></i>';
        xCloseButton.title = 'Close';
        tooltip.appendChild(xCloseButton);
        
        const contentArea = document.createElement('div');
        contentArea.className = 'terminal-history-content';
        tooltip.appendChild(contentArea);
        
        const history = window.terminalHistory[thinkingId];
        history.forEach(entry => {
            const line = document.createElement('div');
            line.className = 'terminal-history-line';
            
            switch (entry.status) {
                case 'analyzing':
                    line.innerHTML = `<span style="color: var(--info-color);">[Analyzing] ${entry.details}</span>`;
                    break;
                case 'command_generated':
                    line.innerHTML = `<span style="color: var(--primary-light);">[Command] ${entry.details}</span>`;
                    break;
                case 'executing':
                    line.innerHTML = `<span style="color: var(--warning-color);">[Executing] ${entry.details}</span>`;
                    break;
                case 'output':
                    if (entry.error) {
                        line.innerHTML = `<span style="color: var(--error-color);">stderr> ${entry.details}</span>`;
                    } else {
                        line.innerHTML = `<span style="color: var(--success-color);">stdout> ${entry.details}</span>`;
                    }
                    break;
                case 'fixing':
                    line.innerHTML = `<span style="color: var(--warning-color);">[Fixing] ${entry.details}</span>`;
                    break;
                case 'fixed':
                    line.innerHTML = `<span style="color: var(--success-color);">[Fixed] ${entry.details}</span>`;
                    break;
                case 'finished':
                case 'completed':
                    line.innerHTML = `<span style="color: var(--success-color);">[Completed] ${entry.details}</span>`;
                    break;
                case 'failed':
                    line.innerHTML = `<span style="color: var(--error-color);">[Failed] ${entry.details}</span>`;
                    break;
                case 'error':
                    line.innerHTML = `<span style="color: var(--error-color);">[Error] ${entry.details}</span>`;
                    break;
                default:
                    line.textContent = JSON.stringify(entry);
            }
            
            contentArea.appendChild(line);
        });
        
        const closeTerminalHistory = () => {
            tooltip.remove();
            overlay.remove();
            document.removeEventListener('keydown', handleEscapeKey);
        };
        
        closeButton.addEventListener('click', closeTerminalHistory);
        xCloseButton.addEventListener('click', closeTerminalHistory);
        
        tooltip.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeTerminalHistory();
            }
        });
        
        const handleEscapeKey = (e) => {
            if (e.key === 'Escape') {
                closeTerminalHistory();
            }
        };
        document.addEventListener('keydown', handleEscapeKey);
        
        setTimeout(() => {
            contentArea.focus();
        }, 100);
    }
});