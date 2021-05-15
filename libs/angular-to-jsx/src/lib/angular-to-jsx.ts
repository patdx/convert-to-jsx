import * as t from '@angular/compiler';
import { parseTemplate, TmplAstNode } from '@angular/compiler';
import { camelCase, pad, startCase } from 'lodash';
import { format } from 'prettier';
import parserBabel from 'prettier/parser-babel';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore react-attr-converter is an old library
import convertAttribute from 'react-attr-converter';
import {
  ClassNameProp,
  NodeContext,
  NodeFragmentContext,
  Props,
} from './types';

const pascalCase = (str: string) => startCase(camelCase(str)).replace(/ /g, '');

const getChildren = (node: t.TmplAstNode): TmplAstNode[] =>
  (node as any).children ?? [];

const printChildrenArray = ({ node, key, indent }: NodeContext) => {
  return (
    getChildren(node).map((child) => printNode({ node: child, key, indent })) ??
    []
  );
};

const printChildren = ({ node, key, indent }: NodeContext): string => {
  return printChildrenArray({ node, key, indent }).join('\n');
};

const printNode = ({
  node,
  key,
  indent = 0,
}: NodeContext): string | undefined => {
  const constructorName = node?.constructor?.name;

  const spaces = pad('', indent ?? 0);

  if (node instanceof t.TmplAstText) {
    return `${spaces}${node.value}`;
  } else if (node instanceof t.TmplAstBoundText) {
    return `${spaces}${(node.value as any).source
      .replace(/{{/g, '{')
      .replace(/}}/g, '}')}`;
  } else if (node instanceof t.TmplAstTemplate) {
    const templateType = node.templateAttrs?.[0]?.name;
    if (templateType === 'ngFor') {
      const sourceName = (node.templateAttrs[1].value as any).source;
      const targetName = node.variables[0].name;
      const text = `{${sourceName}.map((${targetName}, index) => ${printChildren(
        { node, key: 'index' }
      )})}`;
      return text;
    } else if (templateType === 'ngIf') {
      const sourceName = (node.templateAttrs[0].value as any).source;
      const wrapper = sourceName.startsWith('!')
        ? sourceName
        : `Boolean(${sourceName})`;
      const text = `{${wrapper} && ${printChildren({ node })}}`;
      return text;
    } else {
      const warning = `WARNING: Unknown template node type ${templateType}`;
      console.warn(warning);
      return `<div>${warning}</div>`;
      // return `{/* ${warning} */}`;
    }
  } else if (node instanceof t.TmplAstElement) {
    let ngSwitchVar: string | undefined = undefined;

    const tagName = node.name.includes('-') ? pascalCase(node.name) : node.name;

    const props: Props = {};

    node.attributes?.forEach((attr) => {
      if (attr.name === 'class') {
        props.className = {
          bound: false,
          value: attr.value,
        };
      } else {
        props[attr.name] = {
          bound: false,
          value: attr.value,
        };
      }
      // text += ` ${printPropertyName(attr.name)}="${attr.value}"`;
    });

    const inputs = [
      ...(node.inputs ?? []),
      ...(key
        ? [
            {
              name: 'key',
              value: {
                source: key,
              },
            },
          ]
        : []),
    ];

    inputs.forEach((input) => {
      if (input.name === 'class') {
        props.className = {
          bound: true,
          value: (input.value as any).source,
        };
      } else if ((input as any).keySpan?.details?.startsWith('class.')) {
        const [, key] = (input as any).keySpan.details.split('.');
        props.className = props.className ?? {
          bound: false,
          value: '',
        };
        props.className.conditional = props.className.conditional ?? {};
        props.className.conditional[key] = (input.value as any).source;
      } else if (input.name === 'ngSwitch') {
        ngSwitchVar = (input.value as any).source;
      } else {
        props[input.name] = {
          bound: true,
          value: (input.value as any).source,
        };
      }
    });

    node.outputs?.forEach((output) => {
      // const name = `on${pascalCase(output.name)}`;
      const name = output.name.startsWith('on')
        ? output.name
        : `on${output.name}`;
      props[name] = {
        bound: true,
        value: `() => ${(output.handler as any).source}`,
      };
    });

    let text = '';
    text += `${spaces}<${tagName}`;

    Object.entries(props).forEach(([_key, value]) => {
      const key = convertAttribute(_key);
      if (key === 'className' && (value as ClassNameProp).conditional) {
        text += ` ${key}={classNames(${
          value.bound ? value.value : `"${value.value}"`
        }, {${Object.entries((value as ClassNameProp).conditional ?? {})
          .map(([key, value]) => `"${key}": ${value}`)
          .join(', ')}})}`;
      } else if (value.bound) {
        text += ` ${key}={${value.value}}`;
      } else {
        text += ` ${key}="${value.value}"`;
      }
      // text += ` ${printPropertyName(input.name)}={${input.value.source}}`;
    });

    if (node.children?.length >= 1) {
      text += `>\n`;

      if (ngSwitchVar) {
        text += `${spaces}{`;
        const ngSwitchDefaultBlock = node.children.find(
          (child) =>
            (child as t.TmplAstTemplate).templateAttrs[0].name ===
            'ngSwitchDefault'
        );

        const ngSwitchCaseBlocks = node.children.filter(
          (child) =>
            (child as t.TmplAstTemplate).templateAttrs[0].name ===
            'ngSwitchCase'
        );

        // text += `${spaces}{test ? (${children[0]}) :
        ngSwitchCaseBlocks.forEach((node) => {
          text += `\n${spaces}  (${ngSwitchVar} === ${
            ((node as t.TmplAstTemplate).templateAttrs[0].value as any).source
          }) ? ${printNodeFragment({
            nodes: (node as t.TmplAstTemplate).children,
          })} :`;
        });

        if (ngSwitchDefaultBlock) {
          text += `\n${spaces}  ${printNodeFragment({
            nodes: (ngSwitchDefaultBlock as t.TmplAstTemplate).children,
          })}`;
        } else {
          text += `\n${spaces}  null`;
        }

        text += `\n${spaces}}`;

        // const children = printChildrenArray({ node, indent: indent + 2 });

        // children.forEach((child, index, array) => {

        // })

        //         text += `${spaces}{test ? (${children[0]}) :
        // ${spaces}  ${children[0]}
        // ${spaces} :
        // ${spaces}  ${children[1]}}
        // ${spaces}}`;
      } else {
        text += printChildren({ node, indent: indent + 2 });
      }

      text += `\n${spaces}</${tagName}>`;
    } else {
      text += `/>`;
    }

    return text;
  } else {
    console.warn(`Unknown node type`, node);
    return undefined;
  }
};

/**
 * print 1 or more nodes where only 1 node can fit
 */
const printNodeFragment = ({ nodes, key, indent = 0 }: NodeFragmentContext) => {
  const spaces = pad('', indent ?? 0);

  if (nodes?.length >= 2) {
    const text =
      `${spaces}<>` +
      '\n' +
      `${nodes
        .map((node) => printNode({ node, key, indent: indent + 2 }))
        .join('\n')}` +
      '\n' +
      `${spaces}</>`;
    return text;
  } else {
    return printNode({ node: nodes[0], key, indent });
  }
};

export const compileAngularToJsx = (code: string) => {
  const ast = parseTemplate(code, 'stub').nodes;
  let text = `const MyComponent = () => ${printNodeFragment({ nodes: ast })};`;

  try {
    text = format(text, {
      parser: 'babel',
      plugins: [parserBabel],
    });
  } catch (err) {
    text = `WARNING: Tried to format but got error: ${err.message}\n\n` + text;
  }
  return text;
};
