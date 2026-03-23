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

## Screenshots
