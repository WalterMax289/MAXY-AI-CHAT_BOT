// Chat storage & state
let chats = JSON.parse(localStorage.getItem('maxyChats')) || [];
let currentChatId = null;
let pendingDeleteId = null;
let currentMode = 'maxy.1'; // Default mode

// Dynamic backend URLs for each mode (separate servers)
const BACKEND_URLS = 'http://127.0.0.1:5000';

// Elements
const textarea = document.querySelector("textarea");
const welcome = document.querySelector(".welcome");
const messagesContainer = document.getElementById("messages");
const newChatBtn = document.getElementById("newChatBtn");
const recentsList = document.getElementById("recentsList");
const uploadBtn = document.querySelector(".upload-btn");
const submenu = document.querySelector(".upload-submenu");
const submenuButtons = document.querySelectorAll(".upload-submenu button");
const deleteModal = document.getElementById("deleteModal");
const cancelDelete = document.getElementById("cancelDelete");
const confirmDelete = document.getElementById("confirmDelete");
const modeButtons = document.querySelectorAll(".mode-btn");

// Mode switching – updates currentMode and highlights active button
modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    modeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode = btn.dataset.mode;
    console.log(`Switched to mode: ${currentMode} (backend: ${BACKEND_URLS[currentMode]})`);
  });
});

// Format timestamp for recent chats
function formatTime(date) {
  const now = new Date();
  const d = new Date(date);
  const today = now.toDateString() === d.toDateString();
  const yesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === d.toDateString();

  if (today) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (yesterday) {
    return 'Yesterday';
  } else {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

// Persist chats to localStorage
function saveChats() {
  localStorage.setItem('maxyChats', JSON.stringify(chats));
}

// Create a new empty chat
function createNewChat() {
  const newChat = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    title: "New Chat",
    messages: []
  };
  chats.unshift(newChat);
  switchToChat(newChat.id);
  saveChats();
  renderRecents();
}

// Load and display a specific chat
function switchToChat(chatId) {
  currentChatId = chatId;
  const chat = chats.find(c => c.id === chatId);

  messagesContainer.innerHTML = "";

  if (chat && chat.messages.length > 0) {
    welcome.style.display = "none";
    messagesContainer.style.display = "flex";
    chat.messages.forEach(msg => addMessageToDOM(msg.text, msg.role));
  } else {
    welcome.style.display = "flex";
    messagesContainer.style.display = "none";
  }

  // Update active states in sidebar
  document.querySelectorAll('.recent-chat').forEach(el => el.classList.remove('active'));
  newChatBtn.classList.toggle('active', !chatId);
  if (chatId) {
    const activeRecent = document.querySelector(`.recent-chat[data-id="${chatId}"]`);
    if (activeRecent) activeRecent.classList.add('active');
  }

  textarea.focus();
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Render the list of recent chats in sidebar
function renderRecents() {
  recentsList.innerHTML = "";
  chats.forEach(chat => {
    const div = document.createElement('div');
    div.className = 'recent-chat';
    div.dataset.id = chat.id;

    const info = document.createElement('div');
    info.className = 'recent-info';

    const title = document.createElement('div');
    title.className = 'recent-title';
    title.textContent = chat.title;

    const time = document.createElement('div');
    time.className = 'recent-time';
    time.textContent = formatTime(chat.timestamp);

    info.appendChild(title);
    info.appendChild(time);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-chat-btn';
    deleteBtn.innerHTML = `<img src="assets/delete2.gif" alt="Delete">`;
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      pendingDeleteId = chat.id;
      deleteModal.style.display = 'flex';
    });

    div.appendChild(info);
    div.appendChild(deleteBtn);
    div.addEventListener('click', () => switchToChat(chat.id));

    recentsList.appendChild(div);
  });
}

// Add a message bubble to the chat window
function addMessageToDOM(text, role) {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.innerHTML = text.replace(/\n/g, '<br>');
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Add message to current chat (local storage + DOM)
function addMessage(text, role) {
  if (!currentChatId) createNewChat();

  const chat = chats.find(c => c.id === currentChatId);
  chat.messages.push({ text, role, time: new Date().toISOString() });
  chat.timestamp = new Date().toISOString();

  if (chat.messages.length === 1 && role === 'user') {
    chat.title = text.substring(0, 30) + (text.length > 30 ? '...' : '');
  }

  addMessageToDOM(text, role);
  saveChats();
  renderRecents();
}

// Send user message to the appropriate backend based on current mode
async function sendMessage() {
  const text = textarea.value.trim();
  if (!text) return;

  addMessage(text, "user");
  textarea.value = "";
  autoGrow();

  welcome.style.display = "none";
  messagesContainer.style.display = "flex";

  const chat = chats.find(c => c.id === currentChatId);
  const history = chat.messages.slice(0, -1).map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.text
  }));

  const backendUrl = BACKEND_URLS[currentMode] || BACKEND_URLS['maxy.1']; // Fallback to .1

  try {
    const response = await fetch(`${backendUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: history
        // Mode is implicit via the server port – no need to send it
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    addMessage(data.response || "No response received.", "ai");
  } catch (err) {
    console.error("Backend error:", err);
    addMessage("Sorry, connection failed. Is the MAXY backend running on the correct port?", "ai");
  }
}

// Auto-resize textarea
function autoGrow() {
  textarea.style.height = "auto";
  textarea.style.height = textarea.scrollHeight + "px";
}

textarea.addEventListener("input", autoGrow);

// Send on Enter (Shift+Enter for newline)
textarea.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// New chat button
newChatBtn.addEventListener('click', createNewChat);

// Upload submenu toggle
uploadBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  submenu.classList.toggle("open");
});

document.addEventListener("click", () => {
  submenu.classList.remove("open");
});

// Trigger hidden file inputs
submenuButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const type = btn.dataset.type;
    let inputId;
    if (type === "image") inputId = "file-image";
    else if (type === "pdf") inputId = "file-pdf";
    else if (type === "doc") inputId = "file-doc";
    else inputId = "file-any";

    document.getElementById(inputId).click();
    submenu.classList.remove("open");
  });
});

// Local file upload feedback (extend backend later for real processing)
document.querySelectorAll(".hidden-file-input").forEach(input => {
  input.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      addMessage(`Uploaded: ${file.name} (${file.type || 'file'})`, "user");
    }
  });
});

// Delete chat confirmation modal
cancelDelete.addEventListener('click', () => {
  deleteModal.style.display = 'none';
  pendingDeleteId = null;
});

confirmDelete.addEventListener('click', () => {
  if (!pendingDeleteId) return;

  chats = chats.filter(c => c.id !== pendingDeleteId);
  saveChats();

  if (currentChatId === pendingDeleteId) {
    currentChatId = null;
    messagesContainer.innerHTML = "";
    welcome.style.display = "flex";
    messagesContainer.style.display = "none";
    newChatBtn.classList.add('active');
  }

  renderRecents();
  deleteModal.style.display = 'none';
  pendingDeleteId = null;
});

// Initialize app
if (chats.length > 0) {
  switchToChat(chats[0].id);
} else {
  newChatBtn.classList.add('active');
}
renderRecents();
textarea.focus();
autoGrow();
