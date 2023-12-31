export const isValidImg = (file: File) => {
  const mimeType = file.type;
  if (
    !mimeType.startsWith("image/") ||
    (mimeType !== "image/png" &&
      mimeType !== "image/jpg" &&
      mimeType !== "image/jpeg")
  ) {
    alert("Invalid type img");
    return false;
  }
  if (file.size > 5 * 1024 * 1024) {
    alert("Less than 5MB");
    return false;
  }
  return true;
};
