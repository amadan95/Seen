import { Platform } from 'react-native';

export const colors = {
  background: '#20191E',
  surface: '#2C242A',
  elevated: '#3A2B34',
  border: '#4B3E48',
  text: '#F4ECE2',
  muted: '#CABFBE',
  accent: '#E6CFB1',
  success: '#B4D6BD',
  danger: '#F1ABA5',
};
export const spacing = { xs: 4, sm: 8, md: 12, lg: 20, xl: 28, section: 36 };

export const typography = {
  editorial: Platform.select({ ios: 'Georgia', web: 'Georgia, serif', default: 'serif' }),
};
