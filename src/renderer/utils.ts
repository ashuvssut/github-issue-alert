function getContrastColors(hex: string) {
  // Parse hex string (without '#')
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Relative luminance
  const luminance = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;

  // Convert RGB to HSL
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    } else {
      h = (rNorm - gNorm) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  const saturation = Math.round(s * 100);
  let lightness = Math.round(l * 100);

  // Contrast boost if luminance < 0.6
  if (luminance < 0.6) {
    const boost = (0.6 - luminance) * 100;
    const boostFactor = Math.max(0, Math.min((luminance - 0.6) * -1000, 1));
    lightness += Math.round(boost * boostFactor);
  }

  const hsl = `hsl(${h}, ${saturation}%, ${lightness}%)`;

  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.1)`,
    borderColor: hsl,
    color: hsl,
    height: "unset",
  };
}

export { getContrastColors };
