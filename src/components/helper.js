export function checkHeading(text) {

  return /^(\*{1,2})(.*?)(\*{1,2})$/.test(text.trim());
}
