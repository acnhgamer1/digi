class DigiAssistant {
    constructor() {
        this.isListening = false;
        this.isSpeaking = false;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.currentUtterance = null;
        
        this.initializeElements();
        this.initializeSpeechRecognition();
        this.initializeEventListeners();
        this.initializeFaceAnimation();
        
        // Pollinations AI endpoint
        this.aiEndpoint = 'https://text.pollinations.ai/';
    }
    
    initializeElements() {
        this.talkBtn = document.getElementById('talk-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.statusText = document.getElementById('status-text');
        this.transcript = document.getElementById('transcript');
        this.faceContainer = document.querySelector('.face-container');
        this.mouth = document.querySelector('.mouth');
        this.canvas = document.getElementById('face-canvas');
        this.ctx = this.canvas.getContext('2d');
    }
    
    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
        } else if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
        } else {
            this.statusText.textContent = 'Speech recognition not supported in this browser.';
            this.talkBtn.disabled = true;
            return;
        }
        
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        
        this.recognition.onstart = () => {
            this.isListening = true;
            this.setState('listening');
            this.updateUI();
        };
        
        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            this.transcript.textContent = finalTranscript + interimTranscript;
            
            if (finalTranscript) {
                this.processUserInput(finalTranscript);
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.statusText.textContent = `Error: ${event.error}. Please try again.`;
            this.setState('idle');
            this.stopListening();
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            this.setState('idle');
            this.updateUI();
        };
    }
    
    initializeEventListeners() {
        this.talkBtn.addEventListener('click', () => {
            if (!this.isListening && !this.isSpeaking) {
                this.startListening();
            }
        });
        
        this.stopBtn.addEventListener('click', () => {
            this.stopAll();
        });
    }
    
    initializeFaceAnimation() {
        this.drawBaseFace();
        this.animationFrame = null;
    }
    
    setState(state) {
        // Remove all states
        this.faceContainer.classList.remove('listening', 'thinking', 'speaking');
        this.mouth.classList.remove('talking');
        
        // Apply new state
        if (state !== 'idle') {
            this.faceContainer.classList.add(state);
            if (state === 'speaking') {
                this.mouth.classList.add('talking');
            }
        }
        
        // Update status text based on state
        const statusMessages = {
            'idle': 'Ready to chat! Click the button to start.',
            'listening': 'Listening... Speak now!',
            'thinking': 'Thinking...',
            'speaking': 'Speaking...'
        };
        
        if (statusMessages[state]) {
            this.statusText.textContent = statusMessages[state];
        }
    }
    
    drawBaseFace() {
        const ctx = this.ctx;
        
        // Clear canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw subtle static background pattern
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        // Create a consistent pattern using fixed positions
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const radius = 50 + (i % 3) * 30;
            const x = this.canvas.width / 2 + Math.cos(angle) * radius;
            const y = this.canvas.height / 2 + Math.sin(angle) * radius;
            
            ctx.beginPath();
            ctx.arc(x, y, 1 + (i % 3), 0, 2 * Math.PI);
            ctx.fill();
        }
    }
    
    startListening() {
        if (this.recognition && !this.isListening) {
            this.transcript.textContent = '';
            this.recognition.start();
        }
    }
    
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }
    
    stopSpeaking() {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
        }
        this.isSpeaking = false;
        this.setState('idle');
        this.updateUI();
    }
    
    stopAll() {
        this.stopListening();
        this.stopSpeaking();
        this.setState('idle');
    }
    
    async processUserInput(input) {
        this.setState('thinking');
        
        try {
            const response = await this.getAIResponse(input);
            this.speak(response);
        } catch (error) {
            console.error('Error getting AI response:', error);
            this.speak("I'm sorry, I'm having trouble connecting to my brain right now. Could you try again?");
        }
    }
    
    async getAIResponse(input) {
        try {
            // Create a prompt that makes the AI respond like Alexa
            const prompt = `You are Digi, a helpful digital assistant similar to Alexa. You should be friendly, concise, and helpful. Respond to this user message in a conversational way: "${input}"`;
            
            const response = await fetch(this.aiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: "system",
                            content: "You are Digi, a friendly digital assistant. Keep responses conversational and helpful, similar to Alexa. Be concise but warm."
                        },
                        {
                            role: "user",
                            content: input
                        }
                    ],
                    model: "openai"
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const text = await response.text();
            return text || "I heard you, but I'm not sure how to respond to that. Could you try asking something else?";
            
        } catch (error) {
            console.error('AI API Error:', error);
            return "I'm having trouble thinking right now. Could you try again in a moment?";
        }
    }
    
    speak(text) {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
        }
        
        this.currentUtterance = new SpeechSynthesisUtterance(text);
        
        // Try to make it sound more like Alexa
        this.currentUtterance.rate = 0.9;
        this.currentUtterance.pitch = 1.1;
        this.currentUtterance.volume = 0.8;
        
        // Try to find a suitable voice (prefer female voices for Alexa-like experience)
        const voices = this.synthesis.getVoices();
        if (voices.length > 0) {
            const femaleVoice = voices.find(voice => 
                voice.name.toLowerCase().includes('female') || 
                voice.name.toLowerCase().includes('woman') ||
                voice.name.toLowerCase().includes('samantha') ||
                (voice.lang.includes('en') && voice.name.toLowerCase().includes('karen'))
            );
            
            if (femaleVoice) {
                this.currentUtterance.voice = femaleVoice;
            } else {
                // Fallback to first English voice if available
                const englishVoice = voices.find(voice => voice.lang.includes('en'));
                if (englishVoice) {
                    this.currentUtterance.voice = englishVoice;
                }
            }
        }
        
        this.currentUtterance.onstart = () => {
            this.isSpeaking = true;
            this.setState('speaking');
            this.updateUI();
        };
        
        this.currentUtterance.onend = () => {
            this.isSpeaking = false;
            this.setState('idle');
            this.updateUI();
        };
        
        this.currentUtterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            this.isSpeaking = false;
            this.setState('idle');
            this.updateUI();
        };
        
        this.synthesis.speak(this.currentUtterance);
    }
    
    updateUI() {
        if (this.isListening) {
            this.talkBtn.style.display = 'none';
            this.stopBtn.style.display = 'flex';
        } else if (this.isSpeaking) {
            this.talkBtn.style.display = 'none';
            this.stopBtn.style.display = 'flex';
        } else {
            this.talkBtn.style.display = 'flex';
            this.stopBtn.style.display = 'none';
        }
    }
}

// Initialize the assistant when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const initializeWhenReady = () => {
        const voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
            window.digi = new DigiAssistant();
        } else {
            setTimeout(initializeWhenReady, 50);
        }
    };
    initializeWhenReady();
});

// Handle voices loading
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => {
        if (window.digi) {
            console.log('Voices loaded:', speechSynthesis.getVoices().length);
        }
    };
}
