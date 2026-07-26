import { createTheme } from '@mantine/core'

import components from './overrides'

export const theme = createTheme({
    components,
    cursorType: 'pointer',
    fontFamily:
        'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", Vazirmatn, sans-serif',
    fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    breakpoints: {
        xs: '25em',
        sm: '30em',
        md: '48em',
        lg: '64em',
        xl: '80em',
        '2xl': '96em',
        '3xl': '120em',
        '4xl': '160em'
    },
    scale: 1,
    fontSmoothing: true,
    focusRing: 'auto',
    respectReducedMotion: true,
    white: '#ffffff',
    black: '#24292f',
    colors: {
        dark: [
            '#fafafa',
            '#e5e5e5',
            '#adadad',
            '#737373',
            '#525252',
            '#3d3d3d',
            '#2b2b2b',
            '#202020',
            '#171717',
            '#0f0f0f'
        ],
        brand: [
            '#fafafa',
            '#f5f5f5',
            '#e5e5e5',
            '#d4d4d4',
            '#a3a3a3',
            '#737373',
            '#525252',
            '#404040',
            '#262626',
            '#171717'
        ],
        blue: [
            '#ddf4ff',
            '#b6e3ff',
            '#80ccff',
            '#54aeff',
            '#218bff',
            '#0969da',
            '#0550ae',
            '#033d8b',
            '#0a3069',
            '#002155'
        ],
        green: [
            '#dafbe1',
            '#aceebb',
            '#6fdd8b',
            '#4ac26b',
            '#2da44e',
            '#1a7f37',
            '#116329',
            '#044f1e',
            '#003d16',
            '#002d11'
        ],
        yellow: [
            '#fff8c5',
            '#fae17d',
            '#eac54f',
            '#d4a72c',
            '#bf8700',
            '#9a6700',
            '#7d4e00',
            '#633c01',
            '#4d2d00',
            '#3b2300'
        ],
        orange: [
            '#fff1e5',
            '#ffd8b5',
            '#ffb77c',
            '#fb8f44',
            '#e16f24',
            '#bc4c00',
            '#953800',
            '#762c00',
            '#5c2200',
            '#471700'
        ]
    },
    primaryShade: { light: 8, dark: 0 },
    primaryColor: 'brand',
    autoContrast: true,
    luminanceThreshold: 0.3,
    headings: {
        fontFamily: 'inherit',
        fontWeight: '700'
    },
    defaultRadius: 'md'
})
