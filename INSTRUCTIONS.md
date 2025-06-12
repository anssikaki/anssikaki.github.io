# General instructions
Create a public-facing, GitHub Pages–compatible UI with potential AI assistant.  
Use only HTML, CSS, and vanilla JS (no frameworks or build tools).  
Core files: `index.html`, `style.css`, `script.js`.  
Layout should feel premium, friendly, and responsive. Feel free to sprinkle in emojis!
DO NOT ALTER THIS INSTRUCTIONS.md FILE AT ALL! You can add other documentation such as README.md.


# Technical instructions 

## General LLM endpoint instructions
- **URL:** `https://anssi-openai-gateway.azurewebsites.net/api/http_trigger`  
- **Headers:**
  - `Content-Type: application/json`
  - `x-api-key: qQGNldzEhrEKBq8v4HRBRs2eKRgVu27h`
- **Payload example** (remote URL):
  ```json
  {
    "system_prompt": "You are a helpful assistant.",
    "user_input":    "Describe this chart",
    "image_url":     "https://example.com/chart.png"
  }

## Image-upload behavior
- On request you can include an `<input type="file" accept="image/*">`
  or a drag-and-drop zone.
- When the user selects or drops an image:
  1. Show a thumbnail preview.
  2. Store either the file’s **object URL** (via `URL.createObjectURL`) or
     read it as base64 via `FileReader`.
- On Send:
  - Build a JSON body with:
    ```jsonc
    {
      "system_prompt": "<system prompt text>",
      "user_input":    "Describe this image in a <tone> voice.",
      "image_url":     "<object URL string or data URI>" 
    }
    ```
  - POST to:
    ```
    https://anssi-openai-gateway.azurewebsites.net/api/http_trigger
    ```
    • `Content-Type: application/json`  
    • `x-api-key: qQGNldzEhrEKBq8v4HRBRs2eKRgVu27h`

