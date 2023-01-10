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
  ConvertContext,
  NodeContext,
  NodeFragmentContext,
  Props,
} from './types';
import cssToStyle from 'css-to-style';
import get from 'lodash/get';
// import serializeJavascript from 'serialize-javascript';

const UNSUPPORTED_PROPERTIES = [
  'formGroup',
  'formGroupName',
  'formControl',
  'formControlName',
  'formArray',
  'formArrayName',
];

// Sourced from here:
// https://github.com/facebook/react/blob/5890e0e692d1c39eddde0110bd0d123409f31dd3/packages/react-dom/src/shared/DOMProperty.js#L319
const BOOLEAN_PROPERTIES = [
  'allowFullScreen',
  'async',
  // Note: there is a special case that prevents it from being written to the DOM
  // on the client side because the browsers are inconsistent. Instead we call focus().
  'autoFocus',
  'autoPlay',
  'controls',
  'default',
  'defer',
  'disabled',
  'disablePictureInPicture',
  'disableRemotePlayback',
  'formNoValidate',
  'hidden',
  'loop',
  'noModule',
  'noValidate',
  'open',
  'playsInline',
  'readOnly',
  'required',
  'reversed',
  'scoped',
  'seamless',
  // Microdata
  'itemScope',

  'checked',
  // Note: `option.selected` is not updated if `select.multiple` is
  // disabled with `removeAttribute`. We have special logic for handling this.
  'multiple',
  'muted',
  'selected',
];

const pascalCase = (str: string) => startCase(camelCase(str)).replace(/ /g, '');

const getChildren = (node: t.TmplAstNode): TmplAstNode[] =>
  (node as any).children ?? [];

const printChildren = ({
  node,
  key,
  indent,
  scriptContext,
  convertContext,
}: NodeContext): string | undefined => {
  const nodes = getChildren(node);
  return printNodeFragment({
    nodes,
    key,
    indent,
    scriptContext,
    convertContext,
  });
};

const printNode = ({
  node,
  key,
  indent = 0,
  scriptContext,
  convertContext,
}: NodeContext): string | undefined => {
  const constructorName = node?.constructor?.name;

  const spaces = pad('', indent ?? 0);

  if (node instanceof t.TmplAstText) {
    return `${spaces}${scriptContext === 'script' ? `<>` : ``}${node.value}${
      scriptContext === 'script' ? `</>` : ``
    }`;
  } else if (node instanceof t.TmplAstBoundText) {
    return `${spaces}${
      scriptContext === 'script' ? `<>` : ``
    }${(node.value as any).source.replace(/{{/g, '{').replace(/}}/g, '}')}${
      scriptContext === 'script' ? `</>` : ``
    }`;
  } else if (node instanceof t.TmplAstTemplate) {
    const templateType = node.templateAttrs?.[0]?.name;
    if (templateType === 'ngFor') {
      const sourceName = (node.templateAttrs[1].value as any).source;
      const targetName = node.variables[0].name;
      const text = `${
        scriptContext === 'template' ? `{` : `<>{`
      }${sourceName}.map((${targetName}, index) => ${printChildren({
        node,
        key: 'index',
        indent: indent + 2,
        scriptContext: 'script',
        convertContext,
      })})${scriptContext === 'template' ? `}` : `}</>`}`;
      return text;
    } else if (templateType === 'ngIf') {
      const sourceName = (node.templateAttrs[0].value as any).source;
      const wrapper = sourceName.startsWith('!')
        ? `(${sourceName})`
        : `Boolean(${sourceName})`;
      const text = `{${wrapper} && ${printChildren({
        node,
        key,
        indent: 0,
        scriptContext: 'script',
        convertContext,
      })}}`;
      return text;
    } else {
      const warning = `WARNING: Unknown template node type ${templateType}`;
      console.warn(warning);
      return scriptContext === 'template'
        ? `{/* ${warning} */}`
        : `null /* ${warning} */`;
    }
  } else if (node instanceof t.TmplAstElement) {
    let ngSwitchVar: string | undefined = undefined;

    const tagName =
      node.name === 'ng-container'
        ? // TODO: support <> syntax
          'Fragment'
        : node.name.includes('-')
        ? pascalCase(node.name)
        : node.name.startsWith(`:svg:`)
        ? // Note: seems like this is just an internal prefix of the Angular compiler that
          // we need to process. Other HTML parsers on ASTExplorer do it differently.
          // https://github.com/angular/angular/blob/a92a89b0eb127a59d7e071502b5850e57618ec2d/packages/compiler/test/schema/schema_extractor.ts
          node.name.replace(`:svg:`, ``)
        : node.name;

    if (tagName === 'Fragment') {
      convertContext.reactImports.add('Fragment');
    }

    const props: Props = {};

    // look for #myDiv, but not #myDatePicker="appDatePicker"
    const selfReference = node.references.find((ref) => ref.value === '');

    if (selfReference) {
      convertContext.refs.push(selfReference.name);
      convertContext.reactImports.add('useRef');
      // In Angular we can do something like
      // <datepicker #myDatePicker><button (click)="myDatePicker.open();">
      // In React, perhaps we do something like:
      // const myDatePickerRef = useRef();
      // const myDatePicker = myDatePickerRef.current;
      // return <datepicker ref={myDatePickerRef}><button onClick={() => myDatePicker.click()}
      // For style reasons, usually you would defer the `.current` to the end, but it's easier
      // to transpile correctly by destructuring the ref.
      props.ref = {
        bound: true,
        value: `${selfReference.name}Ref`,
      };
    }

    node.attributes?.forEach((attr) => {
      if (attr.name === 'class') {
        props.className = {
          bound: false,
          value: attr.value,
        };
      } else if (attr.name === 'style') {
        const asObj = cssToStyle(attr.value);
        const stringified = JSON.stringify(asObj);
        props.style = {
          bound: true,
          value: stringified,
        };
      } else {
        // check for boolean
        const isBoolean = BOOLEAN_PROPERTIES.some(
          (prop) => prop.toLowerCase() === attr.name.toLowerCase()
        );

        if (isBoolean) {
          props[attr.name] = {
            bound: true,
            value: `true`,
          };
        } else {
          props[attr.name] = {
            bound: false,
            value: attr.value,
          };
        }
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
      } else if (input.name === 'ngClass') {
        const source = (input.value as any).source;
        convertContext.importClsx = true;
        props.className = {
          bound: true,
          value: `clsx(${source})`,
        };

        // TODO: handle ngClass together with [class.xyz]
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
      const name = output.name.startsWith('on')
        ? output.name
        : `on${pascalCase(output.name)}`;

      let functionBody = (output.handler as any).source as string;

      // code like:
      // (click)="handleClick($event)"
      // should be converted to:
      // onClick={event => handleClick(event)}
      const isEvent = functionBody.includes('$event');

      if (isEvent) {
        functionBody = functionBody.replace('$event', 'event');
      }

      const isMultipleLines = functionBody.includes(';');

      const openingBracket = isMultipleLines ? `{` : ``;
      const closingBracket = isMultipleLines ? `}` : ``;

      props[name] = {
        bound: true,
        value: `(${
          isEvent ? `event` : ``
        }) => ${openingBracket}${functionBody}${closingBracket}`,
      };
    });

    let text = '';
    text += `${spaces}<${tagName}`;

    Object.entries(props).forEach(([_key, value]) => {
      const key = convertAttribute(_key);
      if (key === 'className' && (value as ClassNameProp).conditional) {
        convertContext.importClsx = true;
        const classNameArguments: string[] = [];

        if (value.value) {
          // Check for truthy value to avoid bug of
          // Input:  [class.x]="test"
          // Output: className={classNames('', { x: test })}
          classNameArguments.push(
            value.bound ? value.value : `"${value.value}"`
          );
        }
        classNameArguments.push(
          `{${Object.entries((value as ClassNameProp).conditional ?? {})
            .map(([key, value]) => `"${key}": ${value}`)
            .join(', ')}}`
        );

        text += ` ${key}={clsx(${classNameArguments.join(', ')})}`;
      } else if (UNSUPPORTED_PROPERTIES.includes(key)) {
        // For properties that are known to be unsupported in React
        // do not even try to convert them.
        text += `\n// WARNING: Unsupported property ${key}=${value.value} \n`;
      } else {
        const outputKeyAs = key === 'routerLink' ? 'href' : key;

        if (key === 'routerLink') {
          text += `\n// TODO: Integrate link into React router \n`;
        }

        if (value.bound) {
          text += ` ${outputKeyAs}={${value.value}}`;
        } else {
          text += ` ${outputKeyAs}="${value.value}"`;
        }
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
            scriptContext: 'script',
            indent: 0,
            convertContext,
          })} :`;
        });

        if (ngSwitchDefaultBlock) {
          text += `\n${spaces}  ${printNodeFragment({
            nodes: (ngSwitchDefaultBlock as t.TmplAstTemplate).children,
            scriptContext: 'script',
            indent: 0,
            convertContext,
          })}`;
        } else {
          text += `\n${spaces}  null`;
        }

        text += `\n${spaces}}`;
      } else {
        text += printChildren({
          node,
          indent: indent + 2,
          scriptContext: 'template',
          convertContext,
        });
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
const printNodeFragment = ({
  nodes,
  key,
  indent = 0,
  scriptContext,
  convertContext,
}: NodeFragmentContext): string | undefined => {
  const spaces = pad('', indent ?? 0);

  if (scriptContext === 'script') {
    if (nodes?.length >= 2) {
      const text =
        `${spaces}<>` +
        '\n' +
        `${nodes
          .map((node) =>
            printNode({
              node,
              key,
              indent: indent + 2,
              scriptContext: 'template',
              convertContext,
            })
          )
          .join('\n')}` +
        '\n' +
        `${spaces}</>`;
      return text;
    } else {
      return printNode({
        node: nodes[0],
        key,
        indent,
        scriptContext: 'script',
        convertContext,
      });
    }
  } else {
    // template
    // no need for wrapping in fragment
    return nodes
      .map((node) =>
        printNode({
          node,
          key,
          indent: indent + 2,
          scriptContext: 'template',
          convertContext,
        })
      )
      .join('\n');
  }
};

export const compileAngularToJsx = (code: string) => {
  const ast = parseTemplate(code, 'stub').nodes;

  const convertContext: ConvertContext = {
    reactImports: new Set(),
    refs: [],
  };

  const componentBody = printNodeFragment({
    nodes: ast,
    scriptContext: 'script',
    convertContext,
  });

  let text = '';

  if (convertContext.importClsx) {
    text += '\n' + `import clsx from 'clsx';`;
  }
  if (convertContext.reactImports.size >= 1) {
    text +=
      '\n' +
      `import { ${[...convertContext.reactImports].join(', ')} } from 'react';`;
  }

  if (
    convertContext.importClsx ||
    convertContext.reactImports.size >= 1
  ) {
    text += '\n';
  }

  text += '\n';

  text += `const MyComponent = () => {\n`;

  convertContext.refs.forEach((ref) => {
    text += `  const ${ref}Ref = useRef();\n`;
  });

  if (convertContext.refs.length >= 1) {
    text += `\n`;
  }

  text += `  return ${componentBody};};`;

  try {
    text = format(text, {
      parser: 'babel',
      plugins: [parserBabel],
      trailingComma: 'es5',
      singleQuote: true,
      tabWidth: 2,
    });
  } catch (err) {
    text = `WARNING: Tried to format but got error:\n${resolveErrorMessage(err)}\n\n` + text;
  }
  return text;
};


function resolveErrorMessage(err: unknown): string | undefined {
  return get(err, "message") || String(err)
}
