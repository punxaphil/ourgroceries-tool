import { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FALLBACK_CATEGORY_NAME } from '../utils/appUtils';
import { PointerPosition } from '../types';

type Category = { id: string; name?: string | null };
type SelectionLine = { name: string; presses: number };
type ToastInfo = { groupIds?: string[]; keyLetter?: string; x?: number; y?: number };
type ToastCoordinates = { x?: number; y?: number } | null;
type PresenterOptions = {
  lines: string[];
  selectedIndex: number;
  keyLetter: string;
  groupIds: string[] | null;
  position: PointerPosition | null;
};
type Params = {
  allCategories: ReadonlyArray<Category>;
  sortedCategories: ReadonlyArray<Category>;
  categoryNameLookup: Map<string, string>;
  showCategorySelection: (options: PresenterOptions) => void;
  isApplying: boolean;
};
export type UseCategorySelectionResult = {
  selectedCategoryId: string | null;
  setSelectedCategoryId: (id: string | null) => void;
  handleSelectCategory: (
    categoryId: string,
    groupInfo?: SelectionLine[] | null,
    keyLetter?: string,
    selectedIndex?: number,
    groupIds?: string[] | null,
    position?: ToastCoordinates
  ) => void;
  handleCategoryToastSelect: (toast: ToastInfo, index: number) => void;
};

const coercePosition = (input: ToastCoordinates): PointerPosition | null =>
  input ? { x: input.x ?? 0, y: input.y ?? 0 } : null;

const resolveLines = (info: SelectionLine[] | null, fallback: () => string) =>
  !info || info.length === 0 ? [fallback()] : info.map((entry) => entry.name);

const buildGroupMap = (categories: ReadonlyArray<Category>) => {
  const map = new Map<string, string[]>();
  categories.forEach((category) => {
    const letter = (category.name || '').trim().charAt(0).toLowerCase();
    if (!letter) return;
    map.set(letter, [...(map.get(letter) ?? []), category.id]);
  });
  return map;
};

const nextIndex = (ref: MutableRefObject<Map<string, number>>, key: string, length: number, reverse: boolean) => {
  const current = ref.current.get(key);
  if (current === undefined) return reverse ? length - 1 : 0;
  return reverse ? (current - 1 + length) % length : (current + 1) % length;
};

const shouldIgnore = (target: Element | null) => {
  if (!target) return false;
  const element = target as HTMLElement;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable;
};

const isValidKey = (key: string) => /^[\p{L}\p{N}]$/u.test(key);

const buildGroupInfo = (group: string[], index: number, lookup: Map<string, string>) =>
  group.map((id, idx) => ({
    name: lookup.get(id) ?? FALLBACK_CATEGORY_NAME,
    presses: idx >= index ? idx - index : group.length - (index - idx),
  }));

export function useCategorySelection(params: Params): UseCategorySelectionResult {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const cycleRef = useRef(new Map<string, number>());
  const groups = useMemo(() => buildGroupMap(params.sortedCategories), [params.sortedCategories]);
  const nameOf = useCallback(
    (id: string) => params.categoryNameLookup.get(id) ?? FALLBACK_CATEGORY_NAME,
    [params.categoryNameLookup]
  );

  const handleSelectCategory = useCallback(
    (
      categoryId: string,
      info: SelectionLine[] | null = null,
      key = '',
      selectedIndex = 0,
      groupIds: string[] | null = null,
      position: ToastCoordinates = null
    ) => {
      if (params.isApplying) return;
      setSelectedCategoryId(categoryId);
      params.showCategorySelection({
        lines: resolveLines(info, () => nameOf(categoryId)),
        selectedIndex,
        keyLetter: key,
        groupIds,
        position: coercePosition(position),
      });
    },
    [nameOf, params.isApplying, params.showCategorySelection]
  );

  const handleCategoryToastSelect = useCallback(
    (toast: ToastInfo, index: number) => {
      if (!toast.groupIds) return;
      const info = toast.groupIds.map((id) => ({ name: nameOf(id), presses: 0 }));
      handleSelectCategory(toast.groupIds[index], info, toast.keyLetter ?? '', index, toast.groupIds, {
        x: toast.x,
        y: toast.y,
      });
    },
    [handleSelectCategory, nameOf]
  );

  useEffect(() => {
    if (selectedCategoryId !== null) return;
    const first = params.allCategories[0];
    if (first) setSelectedCategoryId(first.id);
  }, [params.allCategories, selectedCategoryId]);

  useEffect(() => {
    cycleRef.current = new Map();
  }, [groups]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (params.isApplying || shouldIgnore(document.activeElement)) return;
      const key = event.key.toLowerCase();
      const group = groups.get(key);
      if (!group || !isValidKey(key) || group.length === 0) return;
      const index = nextIndex(cycleRef, key, group.length, event.shiftKey);
      const info = buildGroupInfo(group, index, params.categoryNameLookup);
      handleSelectCategory(group[index], info, key, index, group);
      cycleRef.current.set(key, index);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [groups, handleSelectCategory, params.categoryNameLookup, params.isApplying]);

  return { selectedCategoryId, setSelectedCategoryId, handleSelectCategory, handleCategoryToastSelect };
}
