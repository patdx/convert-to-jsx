import { transformSync } from '@babel/core';

const PREFIX = 'const Component = props => pug`';
const SUFFIX = '`;';

export function pugToJsx(code: string) {
  const template = PREFIX + code + SUFFIX;
  const out = transformSync(template, {
    plugins: [require('babel-plugin-transform-react-pug')],
  });

  return out.code;
}
