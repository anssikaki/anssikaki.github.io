# Customization Tips

You can tailor the Delivery Assistant to fit your needs by editing the core files.

## Change the API Endpoint
The endpoint URL and API key are configured in `script.js` inside the `fetch` call. If you have your own backend, replace these values accordingly.

## Adjust System Prompts
Each voice option sets a different `system_prompt` in `script.js`. Modify these strings or add new options to customize the personality of the assistant.

## Update the Styles
`style.css` controls the layout and animations. Adjust colors, fonts or spacing to match your branding. The blinking loading indicator can be modified via the `blink` keyframes.
