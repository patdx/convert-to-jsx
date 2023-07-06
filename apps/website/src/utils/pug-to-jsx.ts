import { transformAsync } from '@babel/core';
import transformReactPug from 'babel-plugin-transform-react-pug';
import { escapeTemplateString } from './escape-template-string';

const PREFIX = 'export function Component(props) { return pug`';
const SUFFIX = '`};';

export async function pugToJsx(code: string) {
  const template = PREFIX + escapeTemplateString(code) + SUFFIX;
  const out = await transformAsync(template, {
    plugins: [transformReactPug],
  });

  console.log(out);

  return out.code;
}
