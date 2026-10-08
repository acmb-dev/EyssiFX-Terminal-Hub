document.addEventListener("DOMContentLoaded", async () => {
    const chatContainer = document.getElementById("chat-messages-container");
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("chat-input");
    
    let currentUser = null;

    // Retrieve active session profile
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
    }

    // Load initial messages and attach real-time listener
    loadMessages();
    subscribeToChat();

    // Form submission (Sending messages)
    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const content = chatInput.value.trim();
        if (!content || !currentUser) return;

        chatInput.value = ""; // Reset input quickly

        try {
            const { error } = await supabase
                .from('chat_messages')
                .insert([
                    {
                        user_id: currentUser.id,
                        content: content
                    }
                ]);

            if (error) throw error;
        } catch (err) {
            console.error("Failed to send message:", err.message);
        }
    });

    async function loadMessages() {
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .select(`
                    id,
                    content,
                    created_at,
                    user_id,
                    profiles ( full_name )
                `)
                .order('created_at', { ascending: true })
                .limit(50);

            if (error) throw error;

            chatContainer.innerHTML = "";
            if (data.length === 0) {
                chatContainer.innerHTML = `<p class="text-muted flex-center" style="height: 100%;">No messages yet. Start the conversation!</p>`;
                return;
            }

            data.forEach(msg => appendMessage(msg));
            scrollToBottom();
        } catch (err) {
            console.error("Error loading chat:", err.message);
        }
    }

    function subscribeToChat() {
        supabase
            .channel('public:chat_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload) => {
                // Fetch full message with profile data for the new insert
                const { data } = await supabase
                    .from('chat_messages')
                    .select(`id, content, created_at, user_id, profiles(full_name)`)
                    .eq('id', payload.new.id)
                    .single();

                if (data) {
                    appendMessage(data);
                    scrollToBottom();
                }
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, (payload) => {
                const el = document.getElementById(`msg-${payload.old.id}`);
                if (el) el.remove();
            })
            .subscribe();
    }

    function appendMessage(msg) {
        const isOwn = currentUser && msg.user_id === currentUser.id;
        const senderName = msg.profiles?.full_name || "Trader";
        const initials = senderName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
        const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const messageEl = document.createElement("div");
        messageEl.className = `message-item ${isOwn ? 'own' : ''}`;
        messageEl.id = `msg-${msg.id}`;

        messageEl.innerHTML = `
            <div class="user-avatar">${initials}</div>
            <div class="message-content-box">
                <div class="message-header">
                    <span class="message-sender">${senderName}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-text">${escapeHTML(msg.content)}</div>
                ${isOwn ? `
                    <div class="message-actions">
                        <span onclick="deleteMessage('${msg.id}')"><i class="fas fa-trash"></i> Delete</span>
                    </div>
                ` : ''}
            </div>
        `;

        chatContainer.appendChild(messageEl);
    }

    window.deleteMessage = async function(msgId) {
        try {
            await supabase
                .from('chat_messages')
                .delete()
                .eq('id', msgId);
        } catch (err) {
            console.error("Failed to delete message:", err.message);
        }
    };

    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }
});
