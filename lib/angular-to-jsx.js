import { parseTemplate } from "@angular/compiler";
import { format } from "prettier";
import parserBabel from "prettier/parser-babel";
import { camelCase, startCase, pad } from "lodash";

const pascalCase = (str) => startCase(camelCase(str)).replace(/ /g, "");




// console.log(ast);

const printChildrenArray = ({ node, key, indent }) => {
    return (
        node.children?.map((child) => printNode({ node: child, key, indent })) ?? []
    );
};

const printChildren = ({ node, key, indent }) => {
    return printChildrenArray({ node, key, indent }).join("\n");
};

const printNode = ({ node, key, indent = 0 }) => {
    const type = node.constructor.name;

    const spaces = pad("", indent ?? 0);

    if (type === "Text") {
        return `${spaces}${node.value}`;
    } else if (type === "BoundText") {
        return `${spaces}${node.value.source.replace(/{{/g, "{").replace(/}}/g, "}")}`;
    } else if (type === "Template") {
        const templateType = node.templateAttrs?.[0]?.name;
        if (templateType === "ngFor") {
            const sourceName = node.templateAttrs[1].value.source;
            const targetName = node.variables[0].name;
            const text = `{${sourceName}.map((${targetName}, index) => ${printChildren(
                { node, key: "index" }
            )})}`;
            return text;
        } else if (templateType === "ngIf") {
            const sourceName = node.templateAttrs[0].value.source;
            const wrapper = sourceName.startsWith("!")
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
        return;
    } else if (type === "Element") {
        let ngSwitchVar = undefined;

        const tagName = node.name.includes("-") ? pascalCase(node.name) : node.name;

        /** @type{import("./types").Props} */
        const props = {};

        node.attributes?.forEach((attr) => {
            if (attr.name === "class") {
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
                        name: "key",
                        value: {
                            source: key,
                        },
                    },
                ]
                : []),
        ];

        inputs.forEach((input) => {
            if (input.name === "class") {
                props.className = {
                    bound: true,
                    value: input.value.source,
                };
            } else if (input.keySpan?.details?.startsWith("class.")) {
                const [, key] = input.keySpan.details.split(".");
                props.className = props.className ?? {
                    bound: false,
                    value: "",
                };
                props.className.conditional = props.className.conditional ?? {};
                props.className.conditional[key] = input.value.source;
            } else if (input.name === "ngSwitch") {
                ngSwitchVar = input.value.source;
            } else {
                props[input.name] = {
                    bound: true,
                    value: input.value.source,
                };
            }
        });

        node.outputs?.forEach((output) => {
            // const name = `on${pascalCase(output.name)}`;
            const name = output.name === "click" ? "onClick" : output.name;
            props[name] = {
                bound: true,
                value: `() => ${output.handler.source}`,
            };
        });

        let text = "";
        text += `${spaces}<${tagName}`;

        Object.entries(props).forEach(([key, value]) => {
            if (key === "className" && value.conditional) {
                text += ` ${key}={classNames(${value.bound ? value.value : `"${value.value}"`
                    }, {${Object.entries(value.conditional)
                        .map(([key, value]) => `"${key}": ${value}`)
                        .join(", ")}})}`;
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
                    (child) => child.templateAttrs[0].name === "ngSwitchDefault"
                );

                const ngSwitchCaseBlocks = node.children.filter(
                    (child) => child.templateAttrs[0].name === "ngSwitchCase"
                );

                // text += `${spaces}{test ? (${children[0]}) :
                ngSwitchCaseBlocks.forEach((node) => {
                    text += `\n${spaces}  (${ngSwitchVar} === ${node.templateAttrs[0].value.source
                        }) ? ${printNodeFragment({
                            nodes: node.children,
                        })} :`;
                });

                if (ngSwitchDefaultBlock) {
                    text += `\n${spaces}  ${printNodeFragment({
                        nodes: ngSwitchDefaultBlock.children,
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
        debugger;
        console.warn(`Unknown node type`, node);
    }
};

/**
 * print 1 or more nodes where only 1 node can fit
 */
const printNodeFragment = ({ nodes = [], key, indent = 0 }) => {
    const spaces = pad("", indent ?? 0);

    if (nodes?.length >= 2) {
        const text =
            `${spaces}<>` +
            "\n" +
            `${nodes
                .map((node) => printNode({ node, key, indent: indent + 2 }))
                .join("\n")}` +
            "\n" +
            `${spaces}</>`;
        return text;
    } else {
        return printNode({ node: nodes[0], key, indent });
    }
};

export const compileAngularToJsx = code => {
    const ast = parseTemplate(code, "stub").nodes;
    let text = `const MyComponent = () => ${printNodeFragment({ nodes: ast })};`;

    try {
        text = format(text, {
            parser: "babel",
            plugins: [parserBabel]
        });
    } catch (err) {
        text = `WARNING: Tried to format but got error: ${err.message}\n\n` + text
    }
    return text;
}