import { DecoratorNode, type LexicalNode, type NodeKey } from 'lexical';
import type { ReactNode } from 'react';
import TagChip from './TagChip';

export type TagNodeData = {
  tagId: string;
  description?: string;
};

export type SerializedTagNode = {
  type: 'tag-node';
  version: 2;
  tagId: string;
  description?: string;
  label?: string;
  styleId?: string;
};

export class TagNode extends DecoratorNode<ReactNode> {
  __tagId: string;
  __description?: string;

  static getType(): string {
    return 'tag-node';
  }

  static clone(node: TagNode): TagNode {
    return new TagNode(
      {
        tagId: node.__tagId,
        description: node.__description,
      },
      node.__key,
    );
  }

  constructor(data: TagNodeData, key?: NodeKey) {
    super(key);
    this.__tagId = data.tagId;
    this.__description = data.description;
  }

  getData(): TagNodeData {
    const latest = this.getLatest();
    return {
      tagId: latest.__tagId,
      description: latest.__description,
    };
  }

  setDescription(next: string): void {
    const writable = this.getWritable();
    writable.__description = next;
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'tag-node';
    span.contentEditable = 'false';
    return span;
  }

  updateDOM(): boolean {
    return false;
  }

  exportJSON(): SerializedTagNode {
    return {
      type: 'tag-node',
      version: 2,
      tagId: this.__tagId,
      description: this.__description,
    };
  }

  static importJSON(serialized: SerializedTagNode): TagNode {
    return new TagNode({
      tagId: serialized.tagId,
      description: serialized.description,
    });
  }

  isInline(): boolean {
    return true;
  }

  decorate(): ReactNode {
    return (
      <TagChip tagId={this.__tagId} description={this.__description} nodeKey={this.getKey()} />
    );
  }
}

export function $createTagNode(data: TagNodeData): TagNode {
  return new TagNode(data);
}

export function $isTagNode(node: LexicalNode | null | undefined): node is TagNode {
  return node instanceof TagNode;
}
