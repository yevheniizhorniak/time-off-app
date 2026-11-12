import { cloneElement, useId, type AriaAttributes, type ReactElement } from 'react';
import { createPortal } from 'react-dom';

import { useTooltip } from './useTooltip';

import './Tooltip.scss';

export type TooltipProps = {
  /** Descriptive plain text; must not contain interactive content. */
  content: string;
  /** One enabled, focusable trigger. Custom components must forward `aria-describedby` to their control. Its actions and ref are preserved; touch activation also runs its action. */
  children: ReactElement;
};

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
