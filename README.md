# LocalConnect 

LocalConnect is a neighborhood mutual-aid mobile application developed as an academic thesis project. It focuses on **Human-Centric UI, spatial adaptivity, and privacy by design**, bridging the gap between digital community platforms and digital inclusivity for older adults.

## Core Features

* **Privacy by Design (Location Fuzzing):** Protects user anonymity by rendering a generalized 1km radius on the public map rather than exact GPS coordinates. Private instructions are only revealed upon task acceptance.
* **Senior Mode (Accessibility):** A dedicated global toggle that dynamically adjusts the UI for users with visual or motor impairments by increasing text size, boosting color contrast, and simplifying navigation.
* **Hybrid AI Neighborhood Guide:** An intelligent, empathetic AI assistant powered by **Gemini 2.5 Flash**. It utilizes a cost-effective hybrid architecture (0ms local rule-based menus + secure Supabase Edge Function fallback) to guide users through the app and handle emergency protocols.
* **Smart Feed (Spatial Adaptivity):** The feed automatically sorts mutual-aid tasks based on geographic proximity, user-selected hobby tags, and implicitly logged background interactions.
* **Gamification & Trust System:** Users earn "Karma Points" for completing tasks, allowing them to rank up from *New Neighbor* to *Local Hero*. A 5-star review system ensures community safety.

## Tech Stack

**Frontend:**
* [React Native](https://reactnative.dev/) & [Expo](https://expo.dev/) (Cross-platform mobile framework)
* [NativeWind](https://www.nativewind.dev/) (TailwindCSS for React Native)
* [Zustand](https://zustand-demo.pmnd.rs/) (Lightweight global state management)
* [Lucide React Native](https://lucide.dev/) (Consistent, accessible iconography)

**Backend:**
* [Supabase](https://supabase.com/) (PostgreSQL Database, Authentication, and Storage)
* **Supabase Edge Functions** (Deno/TypeScript serverless functions for secure LLM brokering)
* **Google Gemini 2.5 Flash** (AI Assistant via Edge Function)

## Getting Started

To run this project locally, you will need [Node.js](https://nodejs.org/) and the [Expo CLI](https://docs.expo.dev/get-started/installation/) installed.

### Install dependencies
\`\`\`bash
npm install
\`\`\`

### Environment Variables
Create a \`.env\` file in the root directory and add your Supabase keys:
\`\`\`text
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

### Start the app
\`\`\`bash
npx expo start
\`\`\`
Use the **Expo Go** app on your physical iOS or Android device to scan the QR code and test the geospatial features in the real world!

## Backend Deployment
The Supabase Edge Function that powers the AI Assistant requires deployment to your own Supabase project:
\`\`\`bash
### Link your project
npx supabase link --project-ref your-project-id

### Deploy the function securely (bypassing external bouncer for custom JWT verification)
npx supabase functions deploy chat-assistant --no-verify-jwt
\`\`\`
*Note: Ensure your `GEMINI_API_KEY` is safely stored in the Supabase Cloud Vault.*

## Academic Context
This application was designed, developed, and evaluated as part of a university thesis focusing on how software architecture can adapt to human needs rather than forcing humans to adapt to complex software interfaces.