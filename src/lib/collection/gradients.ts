// Color-identity gradient placeholders — property table §Art Placeholder Gradients.
// Used by the grid tile art region and the modal's mobile art header when
// imageUri is null (READINESS #4).

const MONO: Record<string, string> = {
  W: "linear-gradient(150deg, #efe9d8, #cbbf9c 58%, #9d8f6b)",
  U: "linear-gradient(150deg, #6a9bcb, #305c88 58%, #1c3a57)",
  B: "linear-gradient(150deg, #5a5464, #2c2833 58%, #17151d)",
  R: "linear-gradient(150deg, #cf7157, #8c3627 58%, #571f16)",
  G: "linear-gradient(150deg, #84b277, #406f3b 58%, #264823)",
};
const COLORLESS = "linear-gradient(150deg, #b3a488, #726755 58%, #453e31)";

// 2-color blend palette — light + mid for each identity, used by the multi blend.
const LIGHT: Record<string, string> = { W: "#efe9d8", U: "#6a9bcb", B: "#5a5464", R: "#cf7157", G: "#84b277" };
const MID: Record<string, string>   = { W: "#cbbf9c", U: "#305c88", B: "#2c2833", R: "#8c3627", G: "#406f3b" };

export function identityGradient(identity: string[]): string {
  if (identity.length === 0) return COLORLESS;
  if (identity.length === 1) return MONO[identity[0]] ?? COLORLESS;
  // 2+ colors: use the first two per §Art Placeholder Gradients "Multi (2-color)"
  const [a, b] = identity;
  return `linear-gradient(125deg, ${MID[a]}, ${LIGHT[a]} 40%, ${LIGHT[b]} 60%, ${MID[b]})`;
}
