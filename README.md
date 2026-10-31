# AP Notes OCR

**AP Notes OCR** is an AI-assisted notes, scanning, and document workspace designed for web and Android. Built with React, TypeScript, Vite, and Capacitor, it brings note organization, OCR, PDF utilities, and Gemini-powered writing tools into one interface.

> **Project status:** This repository is actively developed. Some screens and integrations may be experimental or depend on valid service configuration. Verify important results and test features on your own device before relying on them.

## Contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Requirements](#requirements)
- [Run locally](#run-locally)
- [Environment configuration](#environment-configuration)
- [Build for Android](#build-for-android)
- [Data, privacy, and security](#data-privacy-and-security)
- [Known limitations](#known-limitations)
- [Contributing](#contributing)
- [Disclaimer](#disclaimer)
- [Support](#for-support)
- [Developer](#developer)

## Features

### Notes and organization
- Create, edit, and organize notes.
- Use folders, search, pinning, and bulk note actions.
- Move notes to the recycle bin, restore them, or delete them permanently.
- Save notes locally in browser storage.
- Use quick-note entry and note templates/types, including draft, Word-style, spreadsheet-style, and presentation-style workflows.

### AI assistant and writing tools
- Ask the Google Gemini-powered assistant questions.
- Improve, clean up, or reformat text.
- Use AI-powered study and writing assistance.
- Transcribe audio recordings into text and check spelling/grammar.
- Generate images through the image-generation interface when the required API configuration and model access are available.

AI-generated content can be incomplete or incorrect. Review all output before using it for school, work, publication, or important decisions.

### OCR and scanning
- Select or capture an image for text recognition.
- Extract printed and handwritten text using Gemini-powered OCR.
- Choose a recognition language or request automatic language detection.
- Improve handwriting OCR results and clean extracted text.
- Format extracted content as clean text, formal text, or bullet points.

OCR accuracy depends on image quality, handwriting, layout, language, and service availability. Always compare important extracted text against the original image.

### Editor and documents
- Edit and format note content.
- Use drawing/signature tools where supported by the editor.
- Record audio and convert speech to text.
- Export notes and note archives to PDF.
- Create or work with Word-style documents, spreadsheets, presentations, and drafts through the app's document workflows.
- Use the PDF workspace for PDF-related tasks.

The exact availability and fidelity of document operations can vary by file and implementation. Keep original copies of important documents.

### Knowledge and cloud features
- Explore notes through the knowledge screen.
- Use Firebase Authentication and Cloud Firestore integration for account and cloud-related workflows.
- Access cloud storage and collaborative-note functionality where configured.

Cloud and collaboration features require valid Firebase configuration and appropriate Firestore security rules. Their presence in the interface does not guarantee that every workflow is fully production-ready.

### Web app and Android wrapper
- Progressive Web App (PWA) configuration with service-worker support.
- Capacitor-based Android project.
- Responsive, mobile-oriented interface.

## Technology stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS 4
- **AI:** Google GenAI SDK and Gemini
- **Backend services:** Firebase Authentication and Cloud Firestore
- **Android:** Capacitor 8
- **Documents and files:** jsPDF, PDF.js, docx, pptxgenjs, xlsx, and file-saver
- **Search:** Fuse.js
- **PWA:** Vite PWA plugin

## Requirements

- A currently supported Node.js version and npm.
- A Google Gemini API key for AI, OCR, and other Gemini-dependent features.
- Firebase project configuration for account, cloud, or collaboration features.
- Android Studio and Android SDK if you want to build or run the Android project.

## Run locally

1. Clone the repository:

   ```bash
   git clone https://github.com/anknpolley123/AP_NOTES_OCR_apk.git
   cd AP_NOTES_OCR_apk
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a local environment file named `.env.local` in the project root and configure the required values (see [Environment configuration](#environment-configuration)).

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open the local URL printed by Vite. The configured development port is **3000**.

## Environment configuration

The repository includes an `.env.example` template. For local development, create `.env.local` and set the values needed by your setup:

```dotenv
GEMINI_API_KEY=your_gemini_api_key
APP_URL=http://localhost:3000
```

Firebase settings are loaded from `firebase-applet-config.json`. Use a Firebase project you control and review its authentication settings and Firestore rules before enabling cloud features.

**Important API-key warning:** The Vite configuration injects `GEMINI_API_KEY` into the client-side application bundle. A key included in browser code or a distributed APK must not be considered secret; users may be able to extract it. Do not commit personal API keys. For public distribution, prefer a trusted server-side endpoint with authentication, quotas, rate limiting, and abuse monitoring. Restrict and rotate any key that becomes exposed. Do not publish private credentials or service-account keys.

## Build for Android

The repository already contains a Capacitor Android project. To build and synchronize the web application:

```bash
npm run build
npx cap sync android
npx cap open android
```

The final command opens the Android project in Android Studio. From there, use Android Studio/Gradle to build and test the app. Release signing, SDK versions, device permissions, and distribution settings may require additional configuration.

To check the TypeScript project:

```bash
npm run lint
```

To preview the production web build:

```bash
npm run preview
```

The `lint` script runs `tsc --noEmit`; it is a TypeScript check rather than a full style-linting suite.

## Data, privacy, and security

- **Local notes:** The note-storage service uses browser `localStorage`. Clearing site/app data or uninstalling the app may remove locally stored notes. Back up important content independently.
- **AI processing:** Images, audio, prompts, and text submitted to Gemini-powered features may be sent to Google's service for processing. Do not submit passwords, financial information, confidential documents, or other sensitive data unless you understand and accept the applicable service terms.
- **Firebase:** Cloud notes, account information, and related data may be processed by Firebase when those features are used. Configure authentication and Firestore rules carefully; never rely on client-side UI controls as security boundaries.
- **API keys:** A key embedded in the frontend or Android package can be extracted. Avoid public client-side secrets and monitor usage.
- **Permissions:** Camera, microphone, and file access should be granted only when needed.
- **Exports:** Files saved or exported to a device may be accessible to other applications or people who can access that device.
- **Backups:** Export or otherwise back up important notes and source documents before updates or major changes.

## Known limitations

- The project is under active development; some screens or integrations may be incomplete.
- Gemini-dependent features require network access, a valid key, available quota, and supported model access.
- OCR, transcription, image generation, AI writing, and document conversion can produce mistakes or fail.
- Firebase features require correct project setup and security rules.
- Compatibility may vary across browsers, Android versions, devices, and file types.
- This project has not been represented as independently audited or suitable for safety-critical use.

## Contributing

Bug reports and focused pull requests are welcome. Please:
1. Explain the issue or proposed change clearly.
2. Include reproducible steps where possible.
3. Do not include API keys, credentials, private notes, or personal information in commits or issue reports.
4. Run `npm run build` and `npm run lint` when possible.

## Disclaimer

The Developer is not responsible for harm or damages arising from use of this repository, to the maximum extent permitted by applicable law. Please read the full [Legal Disclaimer](DISCLAIMER.md) before use. This notice does not exclude or limit any liability that cannot legally be excluded or limited.

## For Support

<p align="left">
  <a href="https://www.instagram.com/its_an_geun_woo?igsh=OTNqMndzdDFzZ293"><img src="https://img.shields.io/badge/Instagram-Main-E4405F?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram Main" /></a>
  <a href="https://www.instagram.com/its_ankon_polley?igsh=MXQyNnVpcGV2bmF5aw=="><img src="https://img.shields.io/badge/Instagram-Alt-E4405F?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram Alt" /></a>
  <a href="https://x.com/AnkonPolley"><img src="https://img.shields.io/badge/Twitter-Follow-000000?style=for-the-badge&logo=x&logoColor=white" alt="X / Twitter" /></a>
  <a href="https://www.threads.net/@itz_vorzhevik_volnyshev"><img src="https://img.shields.io/badge/Threads-Follow-000000?style=for-the-badge&logo=threads&logoColor=white" alt="Threads" /></a>
  <a href="https://www.facebook.com/share/1DrXE7djH1/"><img src="https://img.shields.io/badge/Facebook-Connect-1877F2?style=for-the-badge&logo=facebook&logoColor=white" alt="Facebook" /></a>
  <a href="https://www.reddit.com/u/robertoppenheimer123/s/1lsT0KNM9r"><img src="https://img.shields.io/badge/Reddit-Profile-FF4500?style=for-the-badge&logo=reddit&logoColor=white" alt="Reddit" /></a>
  <a href="https://pin.it/3uKE8ZdFc"><img src="https://img.shields.io/badge/Pinterest-Saves-E60023?style=for-the-badge&logo=pinterest&logoColor=white" alt="Pinterest" /></a>
</p>

**Project URL:** https://github.com/anknpolley123/AP_NOTES_OCR_apk

## 👨‍💻 Developer

**Ankon Polley**

**Developer | Programmer | Technology Enthusiast**

GitHub: [@anknpolley123](https://github.com/anknpolley123)

---

<p align="center">
  <b>AP Notes OCR — Capture. Organize. Understand.</b>
  <br>
  Made with ❤️ by Ankon Polley
</p>
