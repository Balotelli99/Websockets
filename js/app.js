// ============================================
// VARIABLES
// ============================================
let ws = null;
let currentUser = null;
let currentPartner = null;
let onlineUsers = [];
let chatMessages = {};
let unreadMessages = {};

// ============================================
// DOM SHORTCUTS
// ============================================
const $ = (id) => document.getElementById(id);
const showView = (from, to) => {
    from.classList.replace('view-active', 'view-hidden');
    to.classList.replace('view-hidden', 'view-active');
};

// ============================================
// VIEW NAVIGATION
// ============================================

// Landing -> Login/Register
$('btnToLogin').onclick = () => showView($('landing-view'), $('login-view'));
$('btnToRegister').onclick = () => showView($('landing-view'), $('register-view'));

// Login/Register -> Landing
$('btnBack').onclick = () => showView($('login-view'), $('landing-view'));
$('btnBackToLanding').onclick = () => showView($('register-view'), $('landing-view'));

// Switch between Login and Register
$('linkToRegister').onclick = (e) => { e.preventDefault(); showView($('login-view'), $('register-view')); };
$('linkToLogin').onclick = (e) => { e.preventDefault(); showView($('register-view'), $('login-view')); };

// ============================================
// PASSWORD TOGGLE
// ============================================
$('togglePassword').onclick = () => {
    const input = $('passwordInput');
    input.type = input.type === 'password' ? 'text' : 'password';
};

$('regTogglePassword').onclick = () => {
    const input = $('regPasswordInput');
    input.type = input.type === 'password' ? 'text' : 'password';
};

// ============================================
// WEBSOCKET CONNECTION
// ============================================
function connectWebSocket(username) {
    // Use wss:// for production, ws:// for local
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const protocol = isLocalhost ? 'ws:' : 'wss:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    console.log('Connecting to:', wsUrl);
    
    ws = new WebSocket(wsUrl);
    currentUser = username;
    
    ws.onopen = () => {
        console.log('WebSocket connected!');
        ws.send(JSON.stringify({ type: 'login', username: username }));
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
    };
    
    ws.onmessage = (event) => {
        console.log('Received:', event.data);
        const data = JSON.parse(event.data);
        
        if (data.type === 'userList') {
            console.log('User list:', data.users);
            onlineUsers = data.users.filter(u => u.username !== currentUser);
            renderUserList();
        }
        else if (data.type === 'privateMessage') {
            receiveMessage(data.from, data.content);
        }
    };
}

// ============================================
// USER LIST
// ============================================
function renderUserList() {
    const list = $('chatList');
    if (!list) return;
    
    if (onlineUsers.length === 0) {
        list.innerHTML = '<div class="no-users">Nog geen gebruikers online</div>';
        return;
    }
    
    list.innerHTML = onlineUsers.map(user => {
        const unread = unreadMessages[user.username] || 0;
        const initial = user.username.charAt(0).toUpperCase();
        
        return `
            <div class="chat-item" data-user="${user.username}">
                <div class="user-avatar">${initial}</div>
                <div class="chat-info">
                    <div class="chat-header-info">
                        <span class="chat-name">${user.username}</span>
                    </div>
                    <div class="chat-message-info">
                        <span class="chat-snippet">Klik om te chatten</span>
                        <span class="unread-badge ${unread > 0 ? '' : 'hidden'}">${unread}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add click handlers
    list.querySelectorAll('.chat-item').forEach(item => {
        item.onclick = () => openChat(item.dataset.user);
    });
}

// ============================================
// CHAT SCREEN
// ============================================
function openChat(username) {
    currentPartner = username;
    $('chatPartnerName').textContent = username;
    
    // Reset unread count
    if (unreadMessages[username]) {
        unreadMessages[username] = 0;
        renderUserList();
    }
    
    showView($('chat-app-view'), $('chat-view'));
    renderMessages();
}

function renderMessages() {
    const container = $('chatMessages');
    const key = [currentUser, currentPartner].sort().join('|');
    const messages = chatMessages[key] || [];
    
    container.innerHTML = messages.map(msg => {
        const isSent = msg.from === currentUser;
        const time = new Date(msg.time || Date.now()).toLocaleTimeString('nl-NL', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        return `
            <div class="message ${isSent ? 'sent' : 'received'}">
                <div class="message-content">${msg.content}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
    }).join('');
    
    container.scrollTop = container.scrollHeight;
}

function receiveMessage(from, content) {
    const key = [currentUser, from].sort().join('|');
    
    if (!chatMessages[key]) {
        chatMessages[key] = [];
    }
    
    chatMessages[key].push({
        from: from,
        content: content,
        time: new Date()
    });
    
    // Show in current chat or update unread
    if (currentPartner === from) {
        renderMessages();
    } else {
        unreadMessages[from] = (unreadMessages[from] || 0) + 1;
        renderUserList();
    }
}

function sendMessage() {
    const input = $('chatInput');
    const content = input.value.trim();
    
    if (!content || !ws) return;
    
    const key = [currentUser, currentPartner].sort().join('|');
    
    if (!chatMessages[key]) {
        chatMessages[key] = [];
    }
    
    chatMessages[key].push({
        from: currentUser,
        content: content,
        time: new Date()
    });
    
    ws.send(JSON.stringify({
        type: 'privateMessage',
        to: currentPartner,
        content: content
    }));
    
    input.value = '';
    renderMessages();
}

// Chat event listeners
$('btnSendMessage').onclick = sendMessage;
$('chatInput').onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
$('btnBackToList').onclick = () => {
    currentPartner = null;
    showView($('chat-view'), $('chat-app-view'));
};

// ============================================
// LOGIN / REGISTER
// ============================================
document.querySelectorAll('form').forEach(form => {
    form.onsubmit = (e) => {
        e.preventDefault();
        
        let username;
        
        if ($('login-view').classList.contains('view-active')) {
            // Login form - use email part before @
            const emailInput = $('login-view').querySelector('input[type="email"]');
            username = emailInput.value.split('@')[0];
        } else {
            // Register form - use name input
            const nameInput = $('register-view').querySelector('input[type="text"]');
            username = nameInput.value;
        }
        
        if (!username) {
            alert('Vul een naam in');
            return;
        }
        
        // Save to localStorage
        localStorage.setItem('saChatUsername', username);
        
        // Hide login/register, show chat
        $('login-view').classList.contains('view-active') && 
            $('login-view').classList.replace('view-active', 'view-hidden');
        $('register-view').classList.contains('view-active') && 
            $('register-view').classList.replace('view-active', 'view-hidden');
        $('chat-app-view').classList.replace('view-hidden', 'view-active');
        
        connectWebSocket(username);
    };
});

// Auto-fill saved username
document.addEventListener('DOMContentLoaded', () => {
    const savedUsername = localStorage.getItem('saChatUsername');
    
    if (savedUsername) {
        const loginEmail = $('login-view').querySelector('input[type="email"]');
        const registerName = $('register-view').querySelector('input[type="text"]');
        
        if (loginEmail) loginEmail.value = savedUsername + '@chat.nl';
        if (registerName) registerName.value = savedUsername;
    }
});

// ============================================
// SETTINGS MENU
// ============================================
$('btnSettings').onclick = (e) => {
    e.stopPropagation();
    $('settingsMenu').classList.toggle('hidden');
};

// Close menu when clicking outside
document.onclick = (e) => {
    const menu = $('settingsMenu');
    const btn = $('btnSettings');
    
    if (!menu.contains(e.target) && !btn.contains(e.target) && !menu.classList.contains('hidden')) {
        menu.classList.add('hidden');
    }
};

// Logout
$('btnLogout').onclick = () => {
    $('settingsMenu').classList.add('hidden');
    $('chat-app-view').classList.replace('view-active', 'view-hidden');
    $('landing-view').classList.replace('view-hidden', 'view-active');
    document.querySelectorAll('input').forEach(input => input.value = '');
    localStorage.removeItem('saChatUsername');
    
    if (ws) {
        ws.close();
        ws = null;
    }
};

// Open/close settings
$('btnOpenSettings').onclick = () => {
    $('settingsMenu').classList.add('hidden');
    showView($('chat-app-view'), $('settings-view'));
};

$('btnBackFromSettings').onclick = () => {
    showView($('settings-view'), $('chat-app-view'));
};

// ============================================
// THEME SWITCHER
// ============================================
const themeSettings = {
    cosmic: {
        header: 'linear-gradient(90deg, #667EEA, #764BA2)',
        accent: 'linear-gradient(135deg, #667EEA, #764BA2)',
        bubble: 'linear-gradient(135deg, #667EEA, #764BA2)',
        surface: '#1E293B',
        surfaceLight: '#334155',
        primary: '#A78BFA'
    },
    ocean: {
        header: 'linear-gradient(90deg, #06B6D4, #3B82F6)',
        accent: 'linear-gradient(135deg, #06B6D4, #3B82F6)',
        bubble: 'linear-gradient(135deg, #06B6D4, #3B82F6)',
        surface: '#1A2332',
        surfaceLight: '#1E3A5F',
        primary: '#06B6D4'
    },
    sunset: {
        header: 'linear-gradient(90deg, #F97316, #EC4899)',
        accent: 'linear-gradient(135deg, #F97316, #EC4899)',
        bubble: 'linear-gradient(135deg, #F97316, #EC4899)',
        surface: '#2A1F2E',
        surfaceLight: '#3D2A3D',
        primary: '#F97316'
    },
    forest: {
        header: 'linear-gradient(90deg, #10B981, #34D399)',
        accent: 'linear-gradient(135deg, #10B981, #34D399)',
        bubble: 'linear-gradient(135deg, #10B981, #34D399)',
        surface: '#1A2622',
        surfaceLight: '#234139',
        primary: '#10B981'
    }
};

document.querySelectorAll('.theme-card').forEach(card => {
    card.onclick = () => {
        // Update active state
        document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        
        // Apply theme
        const theme = themeSettings[card.dataset.theme];
        const root = document.documentElement;
        
        root.style.setProperty('--gradient-header', theme.header);
        root.style.setProperty('--gradient-accent', theme.accent);
        root.style.setProperty('--chat-bubble-me', theme.bubble);
        root.style.setProperty('--surface', theme.surface);
        root.style.setProperty('--surface-light', theme.surfaceLight);
        root.style.setProperty('--primary', theme.primary);
    };
});

// ============================================
// FONT SIZE
// ============================================
document.querySelectorAll('.font-item').forEach(item => {
    item.onclick = () => {
        document.querySelectorAll('.font-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        const size = item.dataset.size === 'klein' ? '14px' : '16px';
        document.body.style.fontSize = size;
    };
});

// ============================================
// SEARCH
// ============================================
$('searchInput').oninput = (e) => {
    const query = e.target.value.toLowerCase();
    
    document.querySelectorAll('#chatList .chat-item').forEach(item => {
        const name = item.querySelector('.chat-name').textContent.toLowerCase();
        item.style.display = name.includes(query) ? 'flex' : 'none';
    });
};
