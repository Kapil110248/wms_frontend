/**
 * Play a high-pitched rising beep for Stock IN (Success/Positive)
 */
export const playInBeep = () => {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(660, audioContext.currentTime); // E5
        oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1); // Rise to A5

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.15);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
        console.warn('Audio feedback failed:', e);
    }
};

/**
 * Play a low-pitched warning / danger sound for Stock OUT
 * (Sharp industrial alarm pattern: 3 rapid pulses)
 */
export const playOutBeep = () => {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        const playAlertPulse = (time) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Sawtooth wave provides a harsh, industrial buzzer feel
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(180, time);
            oscillator.frequency.linearRampToValueAtTime(120, time + 0.1);

            gainNode.gain.setValueAtTime(0, time);
            gainNode.gain.linearRampToValueAtTime(0.2, time + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, time + 0.12);

            oscillator.start(time);
            oscillator.stop(time + 0.15);
        };

        // 3 rapid pulses
        playAlertPulse(audioContext.currentTime);
        playAlertPulse(audioContext.currentTime + 0.18);
        playAlertPulse(audioContext.currentTime + 0.36);
    } catch (e) {
        console.warn('Audio feedback failed:', e);
    }
};

/**
 * Play a professional "success beep" for warehouse scanning
 */
export const playSuccessBeep = () => {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
        oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.1); // Slide down to A4

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {
        console.warn('Audio feedback failed:', e);
    }
};
/**
 * Play a sharp error sound for invalid barcode validation
 */
export const playErrorBeep = () => {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const playPulse = (time, freq) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.type = 'square'; // Harsh sound
            oscillator.frequency.setValueAtTime(freq, time);
            gainNode.gain.setValueAtTime(0, time);
            gainNode.gain.linearRampToValueAtTime(0.2, time + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, time + 0.15);
            oscillator.start(time);
            oscillator.stop(time + 0.2);
        };
        // Double low-pitched pulse
        playPulse(audioContext.currentTime, 150);
        playPulse(audioContext.currentTime + 0.2, 120);
    } catch (e) {
        console.warn('Audio feedback failed:', e);
    }
};
