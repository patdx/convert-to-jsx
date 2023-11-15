import { format as prettierFormat } from 'prettier';
import pluginBabel from 'prettier/plugins/babel';
import pluginEstree from 'prettier/plugins/estree';

export function format(code: string) {
  return prettierFormat(code, {
    parser: 'babel',
    plugins: [pluginBabel, pluginEstree],
    singleQuote: true,
  });
}
