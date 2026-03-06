// NORMAL MODE (Dark Deep Purple)
const primaryNormal = '#8382FE';
const secondaryNormal = '#FFD167';
const errorNormal = '#EF4444';
const successNormal = '#10B981';
const backgroundNormal = '#1A1826';
const surfaceNormal = '#323147';
const textNormal = '#FFFFFF';

// SENIOR MODE (High Contrast Light)
const primarySenior = '#1E3A8A';
const secondarySenior = '#0F766E';
const errorSenior = '#B91C1C';
const successSenior = '#047857';
const backgroundSenior = '#F9FAFB';
const surfaceSenior = '#FFFFFF';
const textSenior = '#111827';

export default {
  // NORMAL MODE (Dark Deep Purple)
  light: {
    text: textNormal,
    background: backgroundNormal,
    tint: primaryNormal,
    tabIconDefault: '#A1A0B8',
    tabIconSelected: primaryNormal,
    primary: primaryNormal,
    secondary: secondaryNormal,
    error: errorNormal,
    success: successNormal,
    surface: surfaceNormal,
    border: '#4A4968',
  },
  // SENIOR MODE (High Contrast Light)
  dark: {
    text: textSenior,
    background: backgroundSenior,
    tint: primarySenior,
    tabIconDefault: '#4B5563',
    tabIconSelected: primarySenior,
    primary: primarySenior,
    secondary: secondarySenior,
    error: errorSenior,
    success: successSenior,
    surface: surfaceSenior,
    border: '#9CA3AF',
  },
};
