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

export interface NodeContext {
  node: TmplAstNode;
  key?: string;
  indent?: number;
}

export interface NodeFragmentContext {
  nodes: TmplAstNode[];
  key?: string;
  indent?: number;
}
