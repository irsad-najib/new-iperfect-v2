import { ThemeConfig } from "antd";

const theme: ThemeConfig = {
  token: {
    colorPrimary: "#1268B3",
    colorText: "#13162A",
    colorTextSecondary: "#B3B5BD",
    fontFamily:
      'var(--font-outfit), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSizeHeading1: 41.8,
    fontSizeHeading2: 34.84,
    fontSizeHeading3: 29.03,
    fontSizeHeading4: 24.19,
    fontSizeHeading5: 20.16,
    fontWeightStrong: 600,
    fontSize: 16.8,
    fontSizeXL: 16.8,
    fontSizeLG: 14,
    fontSizeSM: 9.72,
  },
  components: {
    Breadcrumb: {
      fontSize: 24.19, // Adjust this value to your desired font size
      itemColor: "#777986", // Optional: adjust the color if needed
      lastItemColor: "#13162A", // Optional: adjust the color of the last item if needed
      // linkHoverColor: "#1268B3", // Optional: adjust the hover color if needed
      separatorColor: "#000000", // Optional: adjust the separator color if needed
      // fontWeightStrong: 900,
    },
  },
};

export default theme;
