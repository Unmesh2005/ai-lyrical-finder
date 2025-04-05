document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chatBox');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');

    // Function to add a message to the chat
    function addMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
        messageDiv.innerHTML = `<p>${message}</p>`;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Function to show loading message
    function showLoading() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot loading';
        loadingDiv.innerHTML = '<p>Searching for lyrics...</p>';
        chatBox.appendChild(loadingDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
        return loadingDiv;
    }

    // Function to make API request with retry
    async function makeRequest(url, options, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response;
            } catch (error) {
                if (i === retries - 1) throw error;
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
            }
        }
    }

    // Function to handle sending messages
    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        // Add user message to chat
        addMessage(message, true);
        userInput.value = '';

        // Show loading message
        const loadingMessage = showLoading();

        try {
            // Make API call to backend with retry
            const response = await makeRequest('/api/lyrics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ song: message }),
            });

            const data = await response.json();

            // Remove loading message
            chatBox.removeChild(loadingMessage);

            if (data.lyrics) {
                // Add song info
                addMessage(`🎵 ${data.title} by ${data.artist}`);
                // Add lyrics
                addMessage(data.lyrics);
            } else if (data.message) {
                addMessage(data.message);
            } else {
                addMessage('Sorry, I couldn\'t find the lyrics for that song. Please try another song name.');
            }
        } catch (error) {
            console.error('Error:', error);
            // Remove loading message
            chatBox.removeChild(loadingMessage);
            
            if (error.message.includes('Failed to fetch')) {
                addMessage('Unable to connect to the server. Please check your internet connection and try again.');
            } else if (error.message.includes('timeout')) {
                addMessage('The request took too long. Please try again.');
            } else {
                addMessage('Sorry, there was an error processing your request. Please try again later.');
            }
        }
    }

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}); 