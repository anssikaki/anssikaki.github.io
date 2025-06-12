# Form Data Extractor

This single-page web app lets you upload an image or PDF of a form and uses an LLM endpoint to extract all detected field names and values. The result is displayed on screen and, when possible, can be downloaded as a CSV file.

## Usage
1. Open `index.html` in a modern browser.
2. Select an image or PDF containing form data.
3. Click **Extract Data**.
4. Once the AI responds, view the extracted JSON and click **Download CSV** to save the results.

All processing happens client-side except for the call to the provided endpoint.
