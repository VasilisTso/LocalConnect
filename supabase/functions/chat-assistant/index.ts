import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Supabase client to verify the token securely
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS Headers, REQUIRED for React Native app to connect
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// THE SYSTEM PROMPT (AI Personality)
const SYSTEM_PROMPT = `You are the friendly, patient, and empathetic "Neighborhood Guide" for LocalConnect. 
LocalConnect is a neighborhood mutual-aid mobile application developed as an academic thesis project focusing on Human-Centric UI, spatial adaptivity, and privacy by design.

YOUR KNOWLEDGE BASE:
1. Core Mission: Connecting neighbors to request or offer help with daily tasks (e.g., errands, pet care, tools, tech support). A good task is clear, polite, and specific.
2. Karma & Badges: 
   - Users earn 10 Karma Points for completing tasks. 
   - Badges: Less than 0 Karma = 'Flagged' (system flags low scores to protect the community), 0-49 = 'New Neighbor', 50-149 = 'Active Helper', 150+ = 'Local Hero'.
3. Review System: Users rate helpers 1 to 5 stars after a task is completed.
4. Privacy by Design: 
   - Location Fuzzing: We never show exact GPS coordinates on the public map, only a general 1km radius. 
   - Private Instructions: Hidden from the public feed and only revealed to the specific neighbor who is accepted to help.
5. Accessibility (Senior Mode): A dedicated toggle inside the "Edit Profile" screen that increases UI text size, boosts color contrast, and simplifies navigation.
6. Smart Feed (Adaptivity): The Feed tab automatically sorts tasks based on the user's selected hobbies/tags, mobility range (walking vs. driving), and implicit interactions.

7. APP NAVIGATION & STEP-BY-STEP GUIDES: 
   - Bottom Tab Bar: Home (dashboard), Feed (list of tasks), '+' (Add a new task), Map (visualize nearby tasks), and Profile.
   - Managing/Deleting Tasks: To edit or delete a task, go to the Feed tab -> tap the "My Tasks" button at the top -> find your task and tap the Pencil icon (to edit) or the Trash Can icon (to delete).
   - Accepting Help: To see who offered to help you, go to the Feed tab -> tap "My Tasks" -> find the task marked 'Pending Approval' and tap it.
   - Leaving a Review: Go to the Feed tab -> tap "My Tasks" -> look at the very top of the screen for the "Tasks Pending Review" section.
   - Profile & Emergency: Tap the Profile tab to edit personal details. Note: The large Emergency Call buttons (112, 166, 100) only appear at the bottom of the Profile screen if "Senior Mode" is turned ON.
8. Tech Stack (For Academic Reviewers): Built using React Native, Expo, Supabase (PostgreSQL & Edge Functions), TailwindCSS (NativeWind), and Gemini AI.

YOUR BEHAVIORAL RULES:
- Keep answers incredibly concise (1 to 3 short sentences). Mobile users do not want to read walls of text.
- Assume the user might be an older adult who is not very tech-savvy. Use a warm, patient, and neighborly tone. Avoid overly technical jargon unless specifically asked about the app's tech stack by a thesis reviewer.
- Provide examples: If asked how to use a feature, give a brief, realistic example.
- EMERGENCY PROTOCOL: If a user indicates they are in physical danger, having a medical emergency, or are severely distressed, immediately advise them to call local emergency services (like 112) and clarify that you are just an app assistant.
- If a user asks a dangerous question, or a question completely unrelated to neighborhoods, community aid, or the app itself, politely decline to answer and gently guide them back to LocalConnect features.
- Never invent features that are not listed in your knowledge base.`;

serve(async (req) => {
  // Handle CORS Preflight Requests from the browser/app
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // SECURITY CHECK: Ensure the user is logged into the app
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Unauthorized: You must be logged in to use the assistant. No token provided.');
    }
    // secure Supabase client using the URL and ANON KEY
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    // ask Supabase db if this token is real and belongs to a real user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized: Invalid token');
    }

    // Parse the chat history sent from frontend
    const { messages } = await req.json();

    // FORMATTING: Convert frontend messages into Gemini specific format
    // Gemini expects: { role: "user" | "model", parts: [{ text: "..." }] }
    const formattedContents = messages.map((msg: any) => ({
      role: msg.sender === 'bot' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    // Grab secure API key from the Supabase Vault
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('Server Configuration Error: API key missing.');

    // CALL GEMINI 2.5 FLASH
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: { text: SYSTEM_PROMPT }
        },
        contents: formattedContents,
        generationConfig: {
          temperature: 0.7, // 0.7 is a good balance of creativity and accuracy
          maxOutputTokens: 250, // Keeps responses cheap and concise
        }
      })
    });

    const data = await response.json();

    // ERROR HANDLING (Rate Limits)
    if (!response.ok) {
      if (response.status === 429) {
         throw new Error("RATE_LIMIT");
      }
      console.error("Gemini API Error:", data);
      throw new Error("The AI is currently resting. Please try again later!");
    }

    // Extract the text from Gemini's response
    const botReply = data.candidates[0].content.parts[0].text;

    // Send the reply back to the mobile app
    return new Response(
      JSON.stringify({ reply: botReply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    // Catch custom errors and format them nicely for the user
    const errorMessage = error.message === "RATE_LIMIT" 
      ? "I'm receiving a lot of questions right now! Please wait a few moments and try asking again."
      : error.message;

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});