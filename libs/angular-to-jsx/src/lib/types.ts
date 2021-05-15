import { TmplAstNode } from '@angular/compiler';

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
  context: "script" | "template"
}

export interface NodeContext extends NodeContextBase {
  node: TmplAstNode;

}

export interface NodeFragmentContext extends NodeContextBase {
  nodes: TmplAstNode[];
}
