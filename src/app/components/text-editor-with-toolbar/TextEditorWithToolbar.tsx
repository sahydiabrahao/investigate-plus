import { ActiveLinkData, TextEditor } from '@/app/components';

type Props = {
  plainValue: string;
  richValue?: string | null;
  onChange: (plain: string, rich: string) => void;
  placeholder?: string;
  onActiveLinkChange?: (data: ActiveLinkData | null) => void;
};

export function TextEditorWithToolbar({
  plainValue,
  richValue,
  onChange,
  placeholder,
  onActiveLinkChange,
}: Props) {
  return (
    <TextEditor
      plainValue={plainValue}
      richValue={richValue}
      onChange={onChange}
      placeholder={placeholder}
      showToolbar
      onActiveLinkChange={onActiveLinkChange}
    />
  );
}
