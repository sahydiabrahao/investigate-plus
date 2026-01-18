import type { FC } from 'react';
import type { NodeItem, DirNode } from '@/utils/read-directory-tree';
import {
  ExpandIcon,
  CollapseIcon,
  FolderOpenedIcon,
  FolderClosedIcon,
  FileImageIcon,
  FilePdfIcon,
  FileVideoIcon,
  FileAudioIcon,
  FileJsonIcon,
} from '@/icons';
import './TreeNode.scss';
import { ButtonStatus } from '@/app/components';
import { useCaseContext } from '@/context/CaseContext';
import { CaseStatus } from '@/types/json-default';

type TreeNodeProps = {
  node: NodeItem;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;

  onFileClick?: (handle: FileSystemFileHandle, parentDirPath: string | null) => void;

  onDirClick?: (node: DirNode) => void;
};

function isDirectory(node: NodeItem): node is DirNode {
  return node.type === 'directory';
}

function getFileIconByName(name: string): FC<{ size?: number; color?: string }> {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext && ['mp4', 'mov', 'avi', 'wmv', 'mkv', 'flv', 'webm', 'm4v'].includes(ext)) {
    return FileVideoIcon;
  }
  if (ext && ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a', 'wma', 'aiff', 'amr'].includes(ext)) {
    return FileAudioIcon;
  }
  if (ext && ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
    return FileImageIcon;
  }
  if (ext && ['json'].includes(ext)) {
    return FileJsonIcon;
  }
  return FilePdfIcon;
}

function getParentDirPath(path: string): string | null {
  const idx = path.lastIndexOf('/');
  if (idx <= 0) return null;
  return path.slice(0, idx);
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

  const { getStatus, setCurrentDirPath } = useCaseContext();

  const handleLabelClick = () => {
    if (directory) {
      setCurrentDirPath(node.path);

      onDirClick?.(node);
      onToggle(node.path);
      return;
    }

    if (!onFileClick) return;

    const parentDirPath = getParentDirPath(node.path);
    onFileClick(node.handle, parentDirPath);
  };

  const DirectoryIcon = isExpanded ? FolderOpenedIcon : FolderClosedIcon;
  const FileIcon = !directory ? getFileIconByName(node.name) : null;

  let folderStatus: CaseStatus | null = null;

  if (directory) {
    const baseName = node.name;
    const caseJsonChild = node.children.find(
      (child) =>
        child.type === 'file' && child.name.toLowerCase() === `${baseName.toLowerCase()}.json`,
    );

    if (caseJsonChild) {
      const fileKey = caseJsonChild.name;
      folderStatus = getStatus(fileKey);
    }
  }

  return (
    <div className='tree-node' role='treeitem' aria-expanded={directory ? isExpanded : undefined}>
      <div className='tree-node__row' style={{ paddingLeft: depth * 16 }}>
        {directory ? (
          <button
            type='button'
            className='tree-node__expander'
            onClick={() => {
              setCurrentDirPath(node.path);
              onToggle(node.path);
            }}
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

        <button
          type='button'
          className='tree-node__label'
          onClick={handleLabelClick}
          title={node.name}
        >
          {node.name}
        </button>

        {directory && folderStatus !== null && (
          <span className='tree-node__status'>
            <ButtonStatus status={folderStatus} size='md' />
          </span>
        )}
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
              onFileClick={onFileClick}
              onDirClick={onDirClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
