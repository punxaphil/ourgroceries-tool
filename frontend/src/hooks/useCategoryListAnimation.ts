import { MutableRefObject, useLayoutEffect, useRef } from 'react';

const DEFAULT_SELECTOR = '.category-list-item';
const FLIP_EASING = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';

type CategoryElement = HTMLElement & { dataset: { categoryId?: string } };
type AnimationDependency = string | number | boolean | null | undefined;

export interface UseCategoryListAnimationOptions {
  containerRef: MutableRefObject<HTMLElement | null>;
  selector?: string;
  dependencies?: ReadonlyArray<AnimationDependency>;
}

const selectElements = (container: HTMLElement | null, selector: string) => {
  if (!container) return [] as CategoryElement[];
  return Array.from(container.querySelectorAll(selector)).filter(
    (node): node is CategoryElement => node instanceof HTMLElement
  );
};

const measureTop = (element: HTMLElement) => element.getBoundingClientRect().top;

const animateShift = (element: HTMLElement, delta: number) => {
  element.style.transform = `translateY(${delta}px)`;
  element.style.transition = 'none';
  requestAnimationFrame(() => {
    element.style.transition = FLIP_EASING;
    element.style.transform = 'translateY(0)';
  });
};

const updateElement = (element: CategoryElement, previous: Map<string, number>, next: Map<string, number>) => {
  const id = element.dataset.categoryId;
  if (!id) return;
  const top = measureTop(element);
  next.set(id, top);
  const prior = previous.get(id);
  if (prior === undefined || prior === top) return;
  animateShift(element, prior - top);
};

export const useCategoryListAnimation = ({
  containerRef,
  selector = DEFAULT_SELECTOR,
  dependencies = [],
}: UseCategoryListAnimationOptions) => {
  const positionsRef = useRef(new Map<string, number>());
  const dependencyKey = dependencies.map(String).join('|');
  useLayoutEffect(() => {
    const elements = selectElements(containerRef.current, selector);
    const nextPositions = new Map<string, number>();
    elements.forEach((element) => updateElement(element, positionsRef.current, nextPositions));
    positionsRef.current = nextPositions;
  }, [containerRef, selector, dependencyKey]);
};
