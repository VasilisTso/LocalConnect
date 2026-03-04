const primaryNormal = '#8382FE';
const primarySenior = '#000000';

const secondaryNormal = '#FFD167';
const secondarySenior = '#FFC107';

export default {
  // NORMAL MODE (Dark Deep Purple)
  light: {
    text: '#FFFFFF',
    background: '#1A1826',
    tint: primaryNormal,
    tabIconDefault: '#A1A0B8',
    tabIconSelected: primaryNormal,
    primary: primaryNormal,
    secondary: secondaryNormal,
    surface: '#323147',
    border: '#4A4968',
  },
  // SENIOR MODE (High Contrast Light)
  dark: {
    text: '#000000',
    background: '#FFFFFF',
    tint: primarySenior,
    tabIconDefault: '#222222',
    tabIconSelected: primarySenior,
    primary: primarySenior,
    secondary: secondarySenior,
    surface: '#FFFFFF',
    border: '#000000',
  },
};
