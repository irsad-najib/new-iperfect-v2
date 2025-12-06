import { ThemeConfig } from "antd";

const theme: ThemeConfig = {
  token: {
    // === PRIMARY ===
    colorPrimary: "#1268B3",
    colorInfo: "#1268B3",

    // === TEXT ===
    colorText: "#101223", // neutral 900
    colorTextSecondary: "#777986", // neutral 500
    colorTextLightSolid: "#FFFFFF",

    // === BACKGROUND ===
    colorBgBase: "#F5F4F3", // neutral 100
    colorBgContainer: "#FFFFFF",

    // === STATUS ===
    colorWarning: "#FBB000",
    colorError: "#E40303",
    colorSuccess: "#0AAD17",

    // === FONT SIZE ===
    fontSize: 14, // md
    fontSizeSM: 8, // sm
    fontSizeLG: 12, // lg
    fontSizeXL: 16, // xl

    fontSizeHeading1: 40, // 4xl
    fontSizeHeading2: 32, // 3xl
    fontSizeHeading3: 28, // 2xl
    fontSizeHeading4: 24, // xl
    fontSizeHeading5: 20, // lg

    fontFamily:
      'var(--font-outfit), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },

  components: {
    Breadcrumb: {
      itemColor: "#B3B5BD", // neutral 500
      lastItemColor: "#101223", // neutral 900
      separatorColor: "#B5B5BD",
      fontSize: 24,
      fontWeightStrong: 600,
    },
    Button: {
      primaryShadow: "none",
      defaultShadow: "none",
      borderRadius: 8,
      controlHeight: 40,
    },
  },
};

export default theme;
