/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,html,mdx}",
  ],
  darkMode: "class",
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px'
    },
    extend: {
      colors: {
        // Primary Colors
        primary: {
          DEFAULT: "var(--primary-background)",
          foreground: "var(--primary-foreground)",
          light: "var(--primary-light)",
        },
        // Secondary Colors
        secondary: {
          DEFAULT: "var(--secondary-background)",
          foreground: "var(--secondary-foreground)",
        },
        // Accent Colors
        accent: {
          success: "var(--accent-success)",
          'success-light': "var(--accent-success-light)",
          error: "var(--accent-error)",
          'error-light': "var(--accent-error-light)",
          warning: "var(--accent-warning)",
        },
        // Text Colors
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          muted: "var(--text-muted)",
          disabled: "var(--text-disabled)",
          link: "var(--text-link)",
          inverse: "var(--text-inverse)",
          transparent: "var(--text-transparent)",
        },
        // Background Colors
        background: {
          main: "var(--bg-main)",
          card: "var(--bg-card)",
          input: "var(--bg-input)",
          search: "var(--bg-search)",
          sidebar: "var(--bg-sidebar)",
          hover: "var(--bg-hover)",
          light: "var(--bg-light)",
          lighter: "var(--bg-lighter)",
        },
        // Border Colors
        border: {
          primary: "var(--border-primary)",
          secondary: "var(--border-secondary)",
          light: "var(--border-light)",
        },
        // Component-Specific Colors
        header: {
          background: "var(--header-bg)",
        },
        sidebar: {
          background: "var(--sidebar-bg)",
        },
        button: {
          primary: {
            background: "var(--button-primary-bg)",
            text: "var(--button-primary-text)",
          },
        },
        card: {
          background: "var(--card-bg)",
        },
        icon: {
          success: "var(--icon-success-bg)",
          primary: "var(--icon-primary-bg)",
          error: "var(--icon-error-bg)",
          warning: "var(--icon-warning-bg)",
        },
      },
      // Font Sizes
      fontSize: {
        'xs': 'var(--font-size-xs)',
        'sm': 'var(--font-size-sm)',
        'base': 'var(--font-size-base)',
        'md': 'var(--font-size-md)',
        'lg': 'var(--font-size-lg)',
        'xl': 'var(--font-size-xl)',
        '2xl': 'var(--font-size-2xl)',
        '3xl': 'var(--font-size-3xl)',
      },
      // Font Weights
      fontWeight: {
        'normal': 'var(--font-weight-normal)',
        'medium': 'var(--font-weight-medium)',
        'semibold': 'var(--font-weight-semibold)',
      },
      // Line Heights
      lineHeight: {
        'xs': 'var(--line-height-xs)',
        'sm': 'var(--line-height-sm)',
        'base': 'var(--line-height-base)',
        'md': 'var(--line-height-md)',
        'lg': 'var(--line-height-lg)',
        'xl': 'var(--line-height-xl)',
        '2xl': 'var(--line-height-2xl)',
        '3xl': 'var(--line-height-3xl)',
        '4xl': 'var(--line-height-4xl)',
        '5xl': 'var(--line-height-5xl)',
      },
      // Font Families
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'lato': ['Lato', 'sans-serif'],
      },
      // Spacing - Margin
      margin: {
        'xs': 'var(--margin-xs)',
        'sm': 'var(--margin-sm)',
        'md': 'var(--margin-md)',
        'lg': 'var(--margin-lg)',
        'xl': 'var(--margin-xl)',
        '2xl': 'var(--margin-2xl)',
        '3xl': 'var(--margin-3xl)',
        '4xl': 'var(--margin-4xl)',
        '5xl': 'var(--margin-5xl)',
        '6xl': 'var(--margin-6xl)',
        '7xl': 'var(--margin-7xl)',
        '8xl': 'var(--margin-8xl)',
        '9xl': 'var(--margin-9xl)',
        '10xl': 'var(--margin-10xl)',
        '11xl': 'var(--margin-11xl)',
        '12xl': 'var(--margin-12xl)',
        '13xl': 'var(--margin-13xl)',
        '14xl': 'var(--margin-14xl)',
        '15xl': 'var(--margin-15xl)',
        '16xl': 'var(--margin-16xl)',
        '17xl': 'var(--margin-17xl)',
        '18xl': 'var(--margin-18xl)',
        '19xl': 'var(--margin-19xl)',
      },
      // Spacing - Padding
      padding: {
        'sm': 'var(--padding-sm)',
        'md': 'var(--padding-md)',
        'lg': 'var(--padding-lg)',
        'xl': 'var(--padding-xl)',
        '2xl': 'var(--padding-2xl)',
        '3xl': 'var(--padding-3xl)',
        '4xl': 'var(--padding-4xl)',
        '5xl': 'var(--padding-5xl)',
        '6xl': 'var(--padding-6xl)',
        '7xl': 'var(--padding-7xl)',
        '8xl': 'var(--padding-8xl)',
        '9xl': 'var(--padding-9xl)',
        '10xl': 'var(--padding-10xl)',
        '11xl': 'var(--padding-11xl)',
        '12xl': 'var(--padding-12xl)',
      },
      // Spacing - Gap
      gap: {
        'xs': 'var(--gap-xs)',
        'sm': 'var(--gap-sm)',
        'md': 'var(--gap-md)',
        'lg': 'var(--gap-lg)',
        'xl': 'var(--gap-xl)',
        '2xl': 'var(--gap-2xl)',
        '3xl': 'var(--gap-3xl)',
        '4xl': 'var(--gap-4xl)',
        '5xl': 'var(--gap-5xl)',
        '6xl': 'var(--gap-6xl)',
        '7xl': 'var(--gap-7xl)',
        '8xl': 'var(--gap-8xl)',
        '9xl': 'var(--gap-9xl)',
        '10xl': 'var(--gap-10xl)',
        '11xl': 'var(--gap-11xl)',
        '12xl': 'var(--gap-12xl)',
      },
      // Border Radius
      borderRadius: {
        'none': 'var(--radius-none)',
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
        '4xl': 'var(--radius-4xl)',
      },
      // Border Width
      borderWidth: {
        DEFAULT: 'var(--border-width-default)',
      },
      // Width
      width: {
        'icon-sm': 'var(--width-icon-sm)',
        'icon-md': 'var(--width-icon-md)',
        'icon-lg': 'var(--width-icon-lg)',
        'avatar': 'var(--width-avatar)',
        'profile': 'var(--width-profile)',
        'logo': 'var(--width-logo)',
        'card': 'var(--width-card)',
        'container': 'var(--width-container)',
      },
    },
  },
  plugins: [],
};