import logUpdate from 'log-update';

class Loading {
    private config = {
        interval: 80,
        // frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
        frames: ['-', '\\', '|', '/']
    }

    private intervalId: NodeJS.Timeout | null = null

    show(text = '') {
        if (this.intervalId) {
            this.hide()
        }
        let i = 0
        this.intervalId = setInterval(() => {
            logUpdate(`${this.config.frames[i = ++i % this.config.frames.length]} ${text}`)
        }, this.config.interval)
    }

    hide(text = '') {
        clearInterval(this.intervalId)
        this.intervalId = null
        logUpdate(text)
    }

}

export default Loading;
