import type { FC } from 'react';
import type { NodeItem, DirNode } from '@/utils/read-directory-tree';
import {
  ExpandIcon,
  CollapseIcon,
  FolderOpenedIcon,
  FolderClosedIcon,
  FileImageIcon,
  FilePdfIcon,
} from '@/icons';
import './TreeNode.scss';

type TreeNodeProps = {
  node: NodeItem;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onFileClick?: (handle: FileSystemFileHandle) => void;
  onDirClick?: (node: DirNode) => void;
};

function isDirectory(node: NodeItem): node is DirNode {
  return node.type === 'directory';
}

function getFileIconByName(name: string): FC<{ size?: number; color?: string }> {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') {
    return FilePdfIcon;
  }
  if (ext && ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
    return FileImageIcon;
  }
  return FilePdfIcon;
}

export function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
  onFileClick,
  onDirClick,
}: TreeNodeProps) {
  const directory = isDirectory(node);
  const isExpanded = directory && expanded.has(node.path);

  const handleLabelClick = () => {
    if (directory) {
      onDirClick?.(node);
      onToggle(node.path);
    } else if (onFileClick) {
      onFileClick(node.handle);
    }
  };

  async function handleFileClick(handle: FileSystemFileHandle) {
    const file = await handle.getFile();
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  const DirectoryIcon = isExpanded ? FolderOpenedIcon : FolderClosedIcon;
  const FileIcon = !directory ? getFileIconByName(node.name) : null;

  return (
    <div className='tree-node' role='treeitem' aria-expanded={directory ? isExpanded : undefined}>
      <div className='tree-node__row' style={{ paddingLeft: depth * 16 }}>
        {directory ? (
          <button
            type='button'
            className='tree-node__expander'
            onClick={() => onToggle(node.path)}
            aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
          >
            {isExpanded ? (
              <CollapseIcon size={14} color='currentColor' />
            ) : (
              <ExpandIcon size={14} color='currentColor' />
            )}
          </button>
        ) : (
          <span className='tree-node__expander tree-node__expander--placeholder' />
        )}

        <span className='tree-node__icon'>
          {directory ? (
            <DirectoryIcon size={16} color='currentColor' />
          ) : (
            FileIcon && <FileIcon size={16} color='currentColor' />
          )}
        </span>
        <button type='button' className='tree-node__label' onClick={handleLabelClick}>
          {node.name}
        </button>
      </div>

      {directory && isExpanded && (
        <div className='tree-node__children' role='group'>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onFileClick={handleFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
