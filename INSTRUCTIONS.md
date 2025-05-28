  # General instructions
  Create a public-facing, GitHub Pages-compatible AI assistant UI. 
  Use only HTML, CSS, and JS (no frameworks or build tools)
  Core application files: index.html, script.js, style.css
  Layout should feel premium, friendly, and responsive. Feel free to use emojis.
  Animate the response loading state (e.g., "thinking...").

  # LLM endpoint instructions
  POST user input to the following backend API:
  - https://anssi-openai-gateway.azurewebsites.net/api/http_trigger
  - Include `Content-Type: application/json`
  - Include a header: `x-api-key: qQGNldzEhrEKBq8v4HRBRs2eKRgVu27h`
    - Payload format:
    ```json
    {
      "system_prompt": "You are a helpful assistant.",
      "user_input": "Hello!"
    }
    ```
  - Response format:
    ```json
    {
      "openai_response": "Hi! How can I help you today?"
    }
    ```
