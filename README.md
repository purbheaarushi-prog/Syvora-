# SYVORA — Netlify edition

This edition uses a Netlify Function at `/.netlify/functions/chat`. The Gemini API key is read only by the function from Netlify environment variables; it is never placed in the HTML or sent to a visitor's browser.

## Required Netlify environment variables

In Netlify, open the SYVORA site's **Project configuration → Environment variables** (menu wording may vary) and add:

- `GEMINI_API_KEY` — your Gemini API key. Enter it privately in Netlify only.
- `SYVORA_ACCESS_CODE` — a separate, long private passphrase shared only with the people allowed to use SYVORA.

Ensure both variables are available to **Functions**, then trigger a new deploy. Netlify documents that variables stored in its UI can be read by Functions at runtime.

## Deploying

The project root contains `index.html`; the function source is in `netlify/functions/chat.mjs`; and `netlify.toml` declares the publish and function directories plus a build command. Deploy the entire project folder through a Netlify workflow that runs its build and packages functions. Do not upload only `index.html`: a static-only deploy will not include the backend function.

If updating the existing drag-and-drop site, open that site's Deploys page and use its deploy drop area. If Netlify's manual drop does not build/package the function for this project, the function must be deployed using Netlify CLI or a Git-connected deploy; the HTML alone cannot provide the secure backend.

## Connect devices

After deployment and after the environment variables are set, open the same Netlify site on each device. In Settings, enter the same `SYVORA_ACCESS_CODE` value once on each device and tap **Test connection**. Do not enter the Gemini API key in SYVORA's page.

Chat history is still stored locally per device in this version; it is not synchronized between phones.
