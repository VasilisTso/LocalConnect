// brain for app adaptivity based on profile data

/*
    Context Awareness (Senior Mode): By keeping isSeniorMode 
    in global state, we can wrap our main app layout in a 
    listener. When isSeniorMode becomes true, we instantly 
    inject the .theme-senior CSS class we created earlier. 
    This changes the entire app's color palette (High Contrast) 
    instantly, without needing to pass props down to every 
    individual button or text component.
    
    The Adaptive Feed Engine: When a user logs in, we will fetch 
    their UserProfile and store it in userProfile. Later, when we 
    call the fetch_adaptive_feed database function, we will 
    directly pass useAppStore.getState().userProfile.tags and 
    useAppStore.getState().userProfile.transport_mode into the 
    query. The feed will immediately re-sort itself if the user 
    updates their tags in their settings!
*/

import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Define the UserProfile type based on our Supabase schema
export interface UserProfile {
  id: string;
  karma_points: number;
  transport_mode: 'walking' | 'driving';
  tags: string[];
  is_senior: boolean;
  is_admin: boolean;
  avg_rating: number;
  avatar_url: string | null;
  onboarding_completed: boolean;
}

// Define the shape of our global state
interface AppState {
  // Authentication State
  session: Session | null;
  setSession: (session: Session | null) => void;
  
  // User Profile State (Crucial for Adaptivity and Admin features)
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;

  // A global function to securely fetch the user's profile and admin status
  fetchUserProfile: (userId: string) => Promise<void>;

  // Accessibility / Human-Centric State
  isSeniorMode: boolean;
  toggleSeniorMode: () => void;
  setSeniorMode: (isActive: boolean) => void;
}

// Create the Zustand store
export const useAppStore = create<AppState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),

  userProfile: null,
  setUserProfile: (profile) => set({ userProfile: profile }),

  // Instantly pulls the profile data (including is_admin) into global memory
  fetchUserProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (data && !error) {
      set({ userProfile: data as UserProfile });
    }
  },

  // Default to false, but we can initialize this based on userProfile.is_senior later
  isSeniorMode: false, 
  toggleSeniorMode: () => set((state) => ({ isSeniorMode: !state.isSeniorMode })),
  setSeniorMode: (isActive) => set({ isSeniorMode: isActive }),
}));