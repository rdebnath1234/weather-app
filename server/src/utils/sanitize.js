export const normalizeCity = (value) => {
  if (!value) return "";
  return String(value).trim().replace(/\s+/g, " ").trim();
};
