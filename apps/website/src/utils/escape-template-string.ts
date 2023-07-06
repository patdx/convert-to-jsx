// https://github.com/rameshvarun/escape-template-string

export function escapeTemplateString(str: string) {
  // '`' +
  // +
  //   '`'
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}
