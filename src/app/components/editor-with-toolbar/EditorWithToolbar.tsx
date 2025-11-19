import { ActiveLinkData, BaseEditor } from '@/app/components';

type Props = {
  plainValue: string;
  richValue?: string | null;
  onChange: (plain: string, rich: string) => void;
  placeholder?: string;
  onActiveLinkChange?: (data: ActiveLinkData | null) => void;
};

export function EditorWithToolbar({
  plainValue,
  richValue,
  onChange,
  placeholder,
  onActiveLinkChange,
}: Props) {
  return (
    <BaseEditor
      plainValue={plainValue}
      richValue={richValue}
      onChange={onChange}
      placeholder={placeholder}
      showToolbar
      onActiveLinkChange={onActiveLinkChange}
    />
  );
}
