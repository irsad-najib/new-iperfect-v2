/**
 * Maps a data path to its corresponding data source name
 * @param path - The full path string from backend
 * @returns The display-friendly data source name
 */
export function getDataSource(path: string): string {
  // Handle plant-specific paths (all start with "Pabrik ")
  if (path.startsWith("Pabrik ")) {
    const parts = path.split("/");
    if (parts.length < 3) return "Invalid Plant Path";

    const folder = parts[1];
    switch (folder) {
      case "raw":
        return "Raw Data";
      case "clean":
        return "Clean Data";
      case "clean_modified":
        return "Clean Data (Modified)";
      case "clean_tie_in_modified":
        return "Clean Data (Tie In Modified)";
      case "clean_last_modified":
        return "Clean Data (Last Modified)";
      default:
        return "Unknown Plant Rule";
    }
  }

  // Handle non-plant paths
  const [prefix] = path.split("/", 1);
  switch (prefix) {
    case "external_data":
      return "External Data";
    case "Tie In":
      return "Tie In";
    case "RawMat":
      return "RawMat";
    case "Lab Data":
      return "Lab Data";
    case "constant":
      return "Constant";
    default:
      return "Unknown Rule";
  }
}
