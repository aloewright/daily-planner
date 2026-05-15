import { createTheme, MantineColorsTuple } from '@mantine/core'

// Tuned around the app accent #4ade80 (Tailwind green-400)
const accent: MantineColorsTuple = [
  '#e8fbf0',
  '#d2f4dd',
  '#a3e8b9',
  '#71dc94',
  '#4ade80',
  '#34c46c',
  '#22a857',
  '#178442',
  '#0e6231',
  '#054321',
]

// Neutral dark palette matching the app surfaces
const surface: MantineColorsTuple = [
  '#f5f5f5',
  '#e5e5e5',
  '#a3a3a3',
  '#737373',
  '#525252',
  '#404040',
  '#2a2a2a',
  '#222222',
  '#1a1a1a',
  '#141414',
]

export const mantineTheme = createTheme({
  primaryColor: 'accent',
  primaryShade: { light: 5, dark: 4 },
  defaultRadius: 'md',
  fontFamily:
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  fontFamilyMonospace:
    "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace",
  colors: {
    accent,
    surface,
  },
})
