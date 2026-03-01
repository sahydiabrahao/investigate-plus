export type TagStyleId = 1 | 2 | 3 | 4 | 5;

export type TagDefinition = {
  id: string;
  label: string;
  styleId: TagStyleId;
};

export type TagInstanceData = {
  tagId: string;
  description?: string;
};
