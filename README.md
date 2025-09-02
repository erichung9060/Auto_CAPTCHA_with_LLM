# Auto CAPTCHA with LLM

A chrome extension for automatically solves CAPTCHAs and fills the verification code using LLM (Gemini, Cloud Vision AI) on any websites.

<p align="center">
  <img src="https://github.com/user-attachments/assets/494a2ccd-13e9-479d-8cfd-ec4822fe5f96" width="49%">
  <img src="https://github.com/user-attachments/assets/dde6527e-9c52-4b05-85b3-651ca97b29a7" width="49%">
</p>


## Features

*   **Auto CAPTCHA Solving:** Detects CAPTCHA images, analyzes them with LLM, and fills in the code automatically.

*   **Smart Recording:** Customize the CAPTCHA image and input field for any website, and the extension will auto-fill the verification code on your next visit.

## Customizable AI Models

|               | Gemini                              | Google Cloud Vision               |
|----------------------|-------------------------------------|------------------------------------|
| Response Time        | Slower    | Faster      |
| API Key Setup        | Simple  | Complex   |
| Accuracy             | Higher    | Lower       |

## How to Use

1.  **Install the Extension** from [Chrome Web Store](https://chromewebstore.google.com/detail/auto-captcha-with-llm/opmhaocokfchpadepjolomhlgeopjdgo)

2.  **Configure API Keys:** Click the extension icon → Enter your Gemini or Cloud Vision API key → Click "Save Keys"

3.  **Record CAPTCHA:** Click extension icon → "Start Recording" → Click CAPTCHA image → Click input field

4.  **Auto-Solve:** Extension will automatically solve CAPTCHAs on subsequent visits

## Permissions Explained

*   **`storage`:** Used to store your API keys and website-specific configurations (CAPTCHA and input field selectors) locally.
*   **`<all_urls>` (Host Permissions):** Allows the extension to interact with any website you visit. This is necessary for the extension to detect and solve CAPTCHAs on any page. *We do not collect or transmit any of your browsing data.*

## Troubleshooting
1. Ensure the CAPTCHA image and input field are correctly selected.
2. Refresh the page.
3. Try recording again.
