import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type DOMAttributes,
  type PointerEvent,
  type RefObject,
} from 'react';

const CLOSE_DELAY = 150;
const VIEWPORT_MARGIN = 8;
const TRIGGER_GAP = 8;

type TooltipBehavior = {
  isOpen: boolean;
  triggerRef: RefObject<HTMLSpanElement | null>;
  tooltipRef: RefObject<HTMLDivElement | null>;
  triggerEvents: Pick<
    DOMAttributes<HTMLSpanElement>,
    | 'onPointerEnter'
    | 'onPointerLeave'
    | 'onPointerDownCapture'
    | 'onPointerCancelCapture'
    | 'onClickCapture'
    | 'onFocusCapture'
    | 'onBlurCapture'
  >;
  tooltipEvents: Pick<DOMAttributes<HTMLDivElement>, 'onPointerEnter' | 'onPointerLeave'>;
};

/** Coordinates pointer, focus, and viewport behavior without changing the trigger's own actions. */
export function useTooltip(content: string): TooltipBehavior {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const interaction = useRef({ focused: false, hovered: false, tooltipHovered: false, pinned: false });
  const touchActivation = useRef(false);
  const [isOpen, setIsOpen] = useState(false);

  const cancelClose = useCallback(() => {
    clearTimeout(closeTimer.current);
    closeTimer.current = undefined;
  }, []);

  const dismiss = useCallback(() => {
    cancelClose();
    interaction.current.pinned = false;
    interaction.current.tooltipHovered = false;
    touchActivation.current = false;
    setIsOpen(false);
  }, [cancelClose]);

  function show(): void {
    cancelClose();
    setIsOpen(true);
  }

  function scheduleClose(): void {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      const { focused, hovered, tooltipHovered, pinned } = interaction.current;
      if (!focused && !hovered && !tooltipHovered && !pinned) setIsOpen(false);
    }, CLOSE_DELAY);
  }

  useEffect(() => cancelClose, [cancelClose]);

  useEffect(() => {
    if (!isOpen) return;

    function isInside(target: EventTarget | null): boolean {
      return target instanceof Node && !!(triggerRef.current?.contains(target) || tooltipRef.current?.contains(target));
    }

    function handleOutside(event: Event): void {
      if (!isInside(event.target)) dismiss();
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') dismiss();
    }

    document.addEventListener('pointerdown', handleOutside, true);
    document.addEventListener('focusin', handleOutside, true);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutside, true);
      document.removeEventListener('focusin', handleOutside, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [dismiss, isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    function updatePosition(): void {
      if (!trigger || !tooltip) return;
      const viewport = window.visualViewport;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportWidth = viewport?.width ?? document.documentElement.clientWidth;
      const viewportHeight = viewport?.height ?? document.documentElement.clientHeight;
      const minLeft = viewportLeft + VIEWPORT_MARGIN;
      const minTop = viewportTop + VIEWPORT_MARGIN;

      tooltip.style.maxWidth = `min(20rem, ${Math.max(0, viewportWidth - VIEWPORT_MARGIN * 2)}px)`;
      tooltip.style.maxHeight = `${Math.max(0, viewportHeight - VIEWPORT_MARGIN * 2)}px`;
      const anchor = trigger.getBoundingClientRect();
      const bubble = tooltip.getBoundingClientRect();
      const above = anchor.top - TRIGGER_GAP - bubble.height;
      const below = anchor.bottom + TRIGGER_GAP;
      const maxTop = viewportTop + viewportHeight - VIEWPORT_MARGIN - bubble.height;
      const preferredTop = above >= minTop || above - minTop >= maxTop - below ? above : below;

      tooltip.style.left = `${Math.max(minLeft, Math.min(anchor.left + (anchor.width - bubble.width) / 2, viewportLeft + viewportWidth - VIEWPORT_MARGIN - bubble.width))}px`;
      tooltip.style.top = `${Math.max(minTop, Math.min(preferredTop, maxTop))}px`;
    }

    updatePosition();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(updatePosition);
    observer?.observe(trigger);
    observer?.observe(tooltip);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    window.visualViewport?.addEventListener('scroll', updatePosition);
    window.visualViewport?.addEventListener('resize', updatePosition);
    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      window.visualViewport?.removeEventListener('scroll', updatePosition);
      window.visualViewport?.removeEventListener('resize', updatePosition);
    };
  }, [content, isOpen]);

  return {
    isOpen,
    triggerRef,
    tooltipRef,
    triggerEvents: {
      onPointerEnter(event: PointerEvent<HTMLSpanElement>): void {
        if (event.pointerType !== 'mouse') return;
        interaction.current.hovered = true;
        show();
      },
      onPointerLeave(event: PointerEvent<HTMLSpanElement>): void {
        if (event.pointerType !== 'mouse') return;
        interaction.current.hovered = false;
        scheduleClose();
      },
      onPointerDownCapture(event: PointerEvent<HTMLSpanElement>): void {
        touchActivation.current = event.pointerType === 'touch' || event.pointerType === 'pen';
      },
      onPointerCancelCapture(): void {
        touchActivation.current = false;
      },
      onClickCapture(): void {
        if (touchActivation.current) {
          touchActivation.current = false;
          if (interaction.current.pinned) {
            dismiss();
          } else {
            interaction.current.pinned = true;
            show();
          }
        } else {
          show();
        }
      },
      onFocusCapture(): void {
        interaction.current.focused = true;
        // Touch focus precedes click; let that click decide whether to open or close.
        if (!touchActivation.current) show();
      },
      onBlurCapture(): void {
        interaction.current.focused = false;
        dismiss();
      },
    },
    tooltipEvents: {
      onPointerEnter(event: PointerEvent<HTMLDivElement>): void {
        if (event.pointerType !== 'mouse') return;
        interaction.current.tooltipHovered = true;
        cancelClose();
      },
      onPointerLeave(event: PointerEvent<HTMLDivElement>): void {
        if (event.pointerType !== 'mouse') return;
        interaction.current.tooltipHovered = false;
        scheduleClose();
      },
    },
  };
}
