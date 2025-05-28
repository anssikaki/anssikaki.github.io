# anssikaki.github.io

This repository hosts a minimal AI-powered **Delivery Assistant** web app designed to run entirely on GitHub Pages. The project uses plain HTML, CSS and JavaScript with no build tools or external frameworks.

The assistant sends user questions to an external LLM API and displays the response with a small "thinking..." animation while waiting. You can choose between multiple "voices" (Friendly, Boring Logistics Expert or Crazy Person) which control the prompt sent to the backend.


Open `index.html` in a browser or deploy the repository with GitHub Pages. Choose a **voice** from the dropdown (Friendly, Boring Logistics Expert, or Crazy Person), type your question about your delivery, and press **Send**. The assistant will show a **thinking...** animation while waiting for a response.

## Training Package

A printable training guide is available in [training_package.pdf](training_package.pdf). It covers setup, usage, and tips for the Delivery Assistant.
=======
## Quick start

1. Clone or download this repository.
2. Open `index.html` in any modern browser, or enable GitHub Pages on your fork to publish it publicly.
3. Ask a question about a package delivery, pick a voice and press **Send 🚀**.

The page will call the hosted API described in [INSTRUCTIONS.md](INSTRUCTIONS.md) and show the assistant's reply in the chat area.

## File overview

- **index.html** – Main HTML file that defines the layout.
- **style.css** – Styles for a responsive, premium-feeling UI with a blinking loading state.
- **script.js** – Handles user input, manages the "voice" settings and calls the backend API.
- **INSTRUCTIONS.md** – Full details for the API endpoint and usage guidelines.

No build step is needed; deploying these files as-is on GitHub Pages is enough.

## Customization

You can modify `script.js` to adjust the available voices or change the default `system_prompt`. The request headers and payload must follow the format shown in `INSTRUCTIONS.md`. If you want to style the chat differently, edit `style.css` or extend the HTML structure in `index.html`.

Additional tips are available in [`docs/USAGE.md`](docs/USAGE.md) and [`docs/CUSTOMIZATION.md`](docs/CUSTOMIZATION.md).

## Development notes

This project deliberately avoids frameworks to keep the source simple. The loading animation is implemented purely with CSS. The API key included in `script.js` is required for the demo endpoint and may be subject to rate limits.

Pull requests with improvements to the UI or documentation are welcome!

