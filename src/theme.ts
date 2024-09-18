import { createTheme, rem } from "@mantine/core";

export const theme = createTheme({
  fontFamily: "var(--font-text)",
  headings: {
    fontFamily: "var(--font-header)",
  },
  defaultRadius: 3,
  white: "#fff",
  black: "#334155",
  primaryColor: "brand",
  colors: {
    brand: [
      "#f4f4f5",
      "#e6e6e6",
      "#cacaca",
      "#aeaeae",
      "#959597",
      "#868689",
      "#7e7e83",
      "#6c6c71",
      "#5f5f67",
      "#52525c",
    ],
  },
  primaryShade: 9,
  fontSizes: {
    xs: rem(12),
    sm: rem(16),
    md: rem(18),
    lg: rem(20),
    xl: rem(22),
  },
  components: {
    Text: {
      defaultProps: {
        color: "brand.8",
      },
    },
    Anchor: {
      defaultProps: {
        underline: "always",
        fw: 600,
      },
    },
    SegmentedControl: {
      defaultProps: {
        bg: "brand.1",
      },
    },
    Button: {
      defaultProps: {
        style: {
          textDecoration: "none",
        },
      },
    },
  },
});
