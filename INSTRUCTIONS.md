  # General instructions
Create a public-facing, GitHub Pages–compatible AI assistant UI.  
Use only HTML, CSS, and vanilla JS (no frameworks or build tools).  
Core files: `index.html`, `style.css`, `script.js`.  
Layout should feel premium, friendly, and responsive. Feel free to sprinkle in emojis!
Animate the response loading state (e.g. show “🤔 thinking…”).

# Tone selection
- Provide a dropdown with the following tone options:
  - `DRY`
  - `CRAZY`
  - `ENGINEER`
  - `BIZ`
- When sending a request, set `user_input` to:
  `"Describe this image in a <tone> voice."` where `<tone>` is the
  selected option.

# Image-upload behavior
- At the top of the chat window, include an `<input type="file" accept="image/*">`
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
      // one of these two:
      "image_url":  "<object URL string>",        // if using URL
      // or
      "image_data": "<base64 string without header>",
      "image_mime": "<optional MIME type, e.g. 'image/png'>"
    }
    ```
  - POST to:
    ```
    https://anssi-openai-gateway.azurewebsites.net/api/http_trigger
    ```
    • `Content-Type: application/json`  
    • `x-api-key: 123qQGNldzEhrEKBq8v4HRBRs2eKRgVu27h`

# LLM endpoint instructions
- **URL:** `https://anssi-openai-gateway.azurewebsites.net/api/http_trigger`  
- **Headers:**
  - `Content-Type: application/json`
  - `x-api-key: qQGNldzEhrEKBq8v4HRBRs2eKRgVu27h`
- **Payload example** (with image):
  ```json
  {
    "system_prompt": "You are a helpful assistant.",
    "user_input":    "Describe this chart",
    "image_url":     "blob:https://…/123-456"
  }
