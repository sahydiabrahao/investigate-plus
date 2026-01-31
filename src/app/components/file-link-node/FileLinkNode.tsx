import type { ReactNode } from 'react';

import {
  DecoratorNode,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  $applyNodeReplacement,
} from 'lexical';

import FileLink from '@/app/components/file-link/FileLink';

import type { FileLinkData } from '@/types/file-link.types';

export type SerializedFileLinkNode = SerializedLexicalNode & {
  type: 'file-link';
  version: 1;
  data: FileLinkData;
};

export class FileLinkNode extends DecoratorNode<ReactNode> {
  private __data: FileLinkData;

  static getType(): string {
    return 'file-link';
  }

  static clone(node: FileLinkNode): FileLinkNode {
    return new FileLinkNode(node.__data, node.__key);
  }

  constructor(data: FileLinkData, key?: NodeKey) {
    super(key);
    this.__data = data;
  }

  getData(): FileLinkData {
    return this.getLatest().__data;
  }

  setData(next: FileLinkData): void {
    const writable = this.getWritable();
    writable.__data = next;
  }

  static importJSON(serializedNode: SerializedFileLinkNode): FileLinkNode {
    return $createFileLinkNode(serializedNode.data);
  }

  exportJSON(): SerializedFileLinkNode {
    return {
      ...super.exportJSON(),
      type: 'file-link',
      version: 1,
      data: this.__data,
    };
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'file-link-node';
    span.setAttribute('data-case-path', this.__data.casePath);
    span.setAttribute('data-relative-path', this.__data.relativePath);
    return span;
  }

  updateDOM(prevNode: FileLinkNode, dom: HTMLElement): boolean {
    const prev = prevNode.__data;
    const next = this.__data;

    if (prev.casePath !== next.casePath) {
      dom.setAttribute('data-case-path', next.casePath);
    }
    if (prev.relativePath !== next.relativePath) {
      dom.setAttribute('data-relative-path', next.relativePath);
    }

    return false;
  }

  isInline(): boolean {
    return true;
  }

  isIsolated(): boolean {
    return true;
  }

  decorate(): ReactNode {
    return <FileLink data={this.__data} />;
  }
}

export function $createFileLinkNode(data: FileLinkData): FileLinkNode {
  return $applyNodeReplacement(new FileLinkNode(data));
}

export function $isFileLinkNode(node: LexicalNode | null | undefined): node is FileLinkNode {
  return node instanceof FileLinkNode;
}
