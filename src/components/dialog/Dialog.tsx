import {
  useEffect,
  useRef,
  type ComponentProps,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type SyntheticEvent,
} from 'react';

import './Dialog.scss';

export type ToaDialogProps = Pick<
  ComponentProps<'dialog'>,
  'id' | 'className' | 'aria-label' | 'aria-labelledby' | 'aria-describedby'
> & {
  /** Parent-controlled visibility. */
  isOpen: boolean;
  /** Requests closure on Escape or a backdrop click. Set `isOpen` to false to close. */
  onDismiss: () => void;
  /** Dialog content, including its accessible heading and any actions. */
  children: ReactNode;
};

/** Native modal that restores focus to the previously focused element on closure. */
export function ToaDialog({ isOpen, onDismiss, children, className, ...dialogProps }: ToaDialogProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;

    const previousFocus = document.activeElement;
    if (!dialog.open) dialog.showModal();

    return () => {
      if (dialog.open) dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [isOpen]);

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>): void {
    event.preventDefault();
    onDismiss();
  }

  function dismissBackdrop(event: MouseEvent<HTMLDialogElement>): void {
    if (event.target !== event.currentTarget) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    ) {
      onDismiss();
    }
  }

  return (
    <dialog
      {...dialogProps}
      className={['toa-dialog', className].filter(Boolean).join(' ')}
      onCancel={handleCancel}
      onClick={dismissBackdrop}
      ref={dialogRef}
    >
      {children}
    </dialog>
  );
}
