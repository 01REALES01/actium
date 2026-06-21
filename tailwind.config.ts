import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // shadcn tokens (mapeados a la paleta Actium vía CSS vars en globals.css)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // Marca Actium
        actium: {
          orange: "#F25C05",
          "orange-hover": "#D94F04",
          "orange-red": "#ff4500",
          amber: "#F27405",
          sandy: "#F28729",
          saddle: "#8C470B",
          espresso: "#592C12",
          graphite: "#282828",
          dim: "#424242",
          gray: "#6B6B6B",
          seashell: "#FFF5EE",
        },

        // Superficies (alias a CSS vars para soportar dark/light)
        "bg-primary": "var(--bg-primary)",
        "bg-secondary": "var(--bg-secondary)",
        "bg-elevated": "var(--bg-elevated)",
        "bg-hover": "var(--bg-hover)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        "border-default": "var(--border-default)",
        "border-subtle": "var(--border-subtle)",

        // Semánticos
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#3B82F6",
      },
      fontFamily: {
        display: ["Ancorli", "var(--font-avenir)", "system-ui", "sans-serif"],
        subtitle: ["var(--font-avenir)", "system-ui", "sans-serif"],
        body: ["var(--font-axiforma)", "system-ui", "sans-serif"],
        sans: ["var(--font-axiforma)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        actium: "12px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        actium: "0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
        "actium-lg": "0 4px 12px rgba(0,0,0,0.4)",
        "actium-glow": "0 0 20px rgba(242,92,5,0.15)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
