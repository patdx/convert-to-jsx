import { format as prettierFormat } from 'prettier';
import parserBabel from 'prettier/parser-babel';

export function format(code: string) {
  return prettierFormat(code, {
    parser: 'babel',
    plugins: [parserBabel],
    singleQuote: true,
  });
}
