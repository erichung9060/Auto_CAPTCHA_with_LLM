# Auto CAPTCHA with LLM

A chrome extension for automatically solves CAPTCHAs and fills verification codes using LLM (Gemini, Cloud Vision). Save time and frustration on your favorite websites!


## Features

*   **Automatic CAPTCHA Solving:** Once configured for a website, the extension automatically detects CAPTCHA images, analyzes them using LLM, and fills in the corresponding verification code in the designated input field.

*   **Smart Recording:** Easily teach the extension which image is the CAPTCHA and which input field is for the code on any website. Just click the "Start Recording" button, select the CAPTCHA image, and then click the input field. The extension remembers your choices for future visits.

## Customizable AI Models
  *   **Google Cloud Vision API:** For the highest accuracy, you can provide your own Cloud Vision API key. This gives you full control and potentially better performance.

  *   **Google Gemini API:** Use your Gemini API key for cutting-edge AI-powered CAPTCHA solving.

  *   **Holey API (Fallback):** If no API keys are provided, the extension uses the Holey OCR API as a fallback, ensuring basic functionality.

## How to Use

1.  **Install the Extension:** Add "Auto CAPTCHA Solver with LLM" to your Chrome browser.

2.  **Configure API Keys (Optional):**
    *   Click the extension icon in the toolbar to open the popup.
    *   Enter your Gemini API key or Cloud Vision API key.
    *   Click "Save Keys".

3.  **Record CAPTCHA and Input Field:**
    *   Visit the website where you want to automate CAPTCHA solving.
    *   Click the extension icon.
    *   Click "Start Recording".
    *   Click the CAPTCHA image on the webpage.
    *   Click the input field where the CAPTCHA code should be entered.
    *   The extension will confirm that it has recorded the information.

4.  **Automatic Solving:** The next time you visit the website and encounter the same CAPTCHA, the extension will automatically solve it and fill in the code!

5.  **Delete Record:**
    *   Click the extension icon.
    *   Click "Delete Record On This Website".
    *   Confirm your deletion.

## Permissions Explained

*   **`storage`:** Used to store your API keys and website-specific configurations (CAPTCHA and input field selectors) locally.
*   **`<all_urls>` (Host Permissions):** Allows the extension to interact with any website you visit. This is necessary for the extension to detect and solve CAPTCHAs on any page. *We do not collect or transmit any of your browsing data.*

## Troubleshooting
1. Ensure the CAPTCHA image and input field are correctly selected.
2. Refresh the page.
3. Try recording again.
