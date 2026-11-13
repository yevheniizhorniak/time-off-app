import { cloneElement, useId, type AriaAttributes, type ReactElement } from 'react';
import { createPortal } from 'react-dom';

import { useTooltip } from './useTooltip';

import './Tooltip.scss';

export type TooltipProps = {
  /** Non-interactive description. */
  content: string;
  /** Enabled, focusable trigger that forwards `aria-describedby`. Actions and ref are preserved. */
  children: ReactElement;
};

/**
 * Shown on hover, focus, or tap. Dismiss with Escape, another tap, or an outside tap.
 * Tapping also activates the trigger.
 */
export default function Tooltip({ content, children }: TooltipProps): ReactElement {
  const id = useId();
  const { isOpen, triggerRef, tooltipRef, triggerEvents, tooltipEvents } = useTooltip(content);
  const trigger = children as ReactElement<AriaAttributes>;
  const describedBy = [trigger.props['aria-describedby'], id].filter(Boolean).join(' ');

  return (
    <>
      <span className="toa-tooltip-trigger" ref={triggerRef} {...triggerEvents}>
        {cloneElement(trigger, { 'aria-describedby': describedBy })}
      </span>
      {createPortal(
        <div className="toa-tooltip" hidden={!isOpen} id={id} ref={tooltipRef} role="tooltip" {...tooltipEvents}>
          {content}
        </div>,
        document.body,
      )}
    </>
  );
}
