document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const messagesContainer = document.getElementById('messages');
    
    const ingestBtn = document.getElementById('ingest-btn');
    const sourceName = document.getElementById('source-name');
    const sourceContent = document.getElementById('source-content');
    const wikiSummary = document.getElementById('wiki-summary');

    // Load Wiki Status
    if (wikiSummary) {
        fetch('/api/wiki')
            .then(res => res.json())
            .then(data => {
                wikiSummary.innerHTML = data.length > 0 
                    ? `<ul>${data.map(p => `<li>${p.title}</li>`).join('')}</ul>`
                    : 'No pages yet.';
            });
    }

    // Handle Chat
    if (chatForm) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = userInput.value.trim();
            if (!message) return;

            addMessage(message, 'user-message');
            userInput.value = '';

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, user_id: 'default_user' })
                });
                const data = await response.json();
                addMessage(data.response, 'ai-message');
            } catch (error) {
                console.error('Error:', error);
                addMessage('Something went wrong.', 'ai-message');
            }
        });
    }

    // Handle Ingest
    if (ingestBtn) {
        ingestBtn.addEventListener('click', async () => {
            const name = sourceName.value.trim();
            const content = sourceContent.value.trim();
            if (!name || !content) return alert('Please fill in both fields');

            ingestBtn.disabled = true;
            ingestBtn.textContent = 'Ingesting...';

            try {
                await fetch('/api/ingest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, content })
                });
                alert('Ingested successfully');
                location.reload(); // Refresh to see new page
            } catch (error) {
                alert('Ingestion failed');
            } finally {
                ingestBtn.disabled = false;
                ingestBtn.textContent = 'Ingest';
            }
        });
    }

    function addMessage(text, className) {
        if (!messagesContainer) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${className}`;
        msgDiv.textContent = text;
        messagesContainer.appendChild(msgDiv);
        msgDiv.scrollIntoView({ behavior: 'smooth' });
    }
});
