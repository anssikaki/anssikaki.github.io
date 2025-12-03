# Future Mill Control Panel

This project demonstrates a futuristic control room interface built with p5.js. It renders live pie charts, rolling measurement panels, a Mill Status log, and an on-panel chat assistant powered by the Azure GPT-4o API described in `INSTRUCTIONS.md`.

## Features
- **Millie Chat:** Ask operational questions, paste prompts, and attach images for the Azure gateway. The chat now handles API errors gracefully so the UI never gets stuck.
- **Status & Departments:** Automated 30-second summaries for Wood Handling, Pulping, Bleaching, Recovery, and the newly added **Water Purification** department.
- **Live Metrics:** Randomized readings for chip level, digester temperature, steam pressure, pH, energy, black liquor flow, and purifier turbidity to represent the new department.
- **Visual Indicators:** Two pie charts refresh every second and a top-right beacon changes color based on status severity.
- **Easter Egg:** Type "bubble party", "water party", or "H2O fiesta" in chat to trigger a celebratory water-themed overlay.

## Usage
Open `index.html` in a modern browser. The p5.js canvas renders automatically; the right column shows chat, while the far-right column shows status history and live metrics. Attach an image via the file picker before sending if you want Millie to consider it. If the API is temporarily unavailable you will see an inline error message instead of the UI freezing.
