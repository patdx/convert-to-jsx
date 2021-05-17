import { TmplAstNode } from '@angular/compiler';

export interface ConvertContext {
  importClassNames?: boolean;
  reactImports: Set<string>;
  refs: string[];
}

export type Props = {
  className?: ClassNameProp;
} & Record<string, Prop>;

export interface Prop {
  bound: boolean;
  value: string;
}

export interface ClassNameProp extends Prop {
  conditional?: Record<string, string>;
}

export interface NodeContextBase {
  key?: string;
  indent?: number;
  scriptContext: 'script' | 'template';
  /** root context of the conversion */
  convertContext: ConvertContext;
}

export interface NodeContext extends NodeContextBase {
  node: TmplAstNode;
}

export interface NodeFragmentContext extends NodeContextBase {
  nodes: TmplAstNode[];
}
